import { Fragment, useState, useEffect, useMemo, forwardRef } from 'react'
import PropTypes from 'prop-types'
import { Badge, Card, Space, Typography } from 'antd'
import { ExpandOutlined as ViewIcon } from '@ant-design/icons'
import { useHelxSearch } from '../'
import { OverviewTab } from './overview-tab'
import { StudiesTab } from './studies-tab'
// import { CdesTab } from './cdes-tab'
import { useAnalytics, useEnvironment } from '../../../contexts'
import classNames from 'classnames'
import './concept-card.css'

const { Text } = Typography

export const ConceptCard = forwardRef(({ index, result, openModalHandler, icon=ViewIcon, className="" }, ref) => {
  let { name, type } = result
  
  const [currentTab, setCurrentTab] = useState('overview')
  const [studies, setStudies] = useState(null)
  const [cdeStudies, setCdeStudies] = useState(null)

  const { analyticsEvents } = useAnalytics()
  const { context } = useEnvironment()
  const { query, fetchVariablesForConceptId, fetchCDEs } = useHelxSearch()

  const tabs = useMemo(() => ({
    'overview': { title: 'Overview',         content: <OverviewTab result={ result } /> },
    'studies':  { title: `Studies`,          content: <StudiesTab studies={ studies } /> },
    'cdes':     { title: `CDEs`,             content: <StudiesTab studies={ cdeStudies } /> },
  }), [result, studies, cdeStudies])

  context.hidden_result_tabs.forEach((tab) => {
    delete tabs[tab]
  })

  const tabList = Object.keys(tabs).map(key => tabs[key].content ? ({ key, tab: tabs[key].title }) : null).filter(tab => tab !== null)
  const tabContents = Object.keys(tabs).reduce((obj, key) => tabs[key].content ? ({ ...obj, [key]: tabs[key].content }) : obj, {})

  const openModal = (...args) => {
    openModalHandler(...args)
    analyticsEvents.resultModalOpened(query, result)
  }

  useEffect(() => {
    const getStudies = async () => {
      const studies = await fetchVariablesForConceptId(result.id, query)
      await new Promise((resolve) => setTimeout(resolve, 2500))
      setStudies(studies)
    }
    const getCdes = async () => {
      const cdes = await fetchCDEs(result.id, query)
      const cdesAsStudies = cdes ? cdes.elements.map((cde) => ({
        // c_id: cde.id,
        c_link: cde.e_link,
        c_name: cde.name,
        elements: null,
        type: "CDE"
      })) : []
      setCdeStudies(cdesAsStudies)
    }
    getStudies()
    getCdes()

    return () => {
      setStudies(null)
      setCdeStudies(null)
    }
  }, [result])

  const IconComponent = icon
  if (name.endsWith(`(${type})`)) name = name.slice(0, name.length - `(${type})`.length)

  return (
    <div className={classNames("result-card", className)} ref={ref}>
      <Card
        title={
          <div>
            <Text>{name} ({type})</Text>
            {/* { name !== result.name && <Text type="warning"> *</Text> } */}
            {/* <Text style={{ color: "rgba(0, 0, 0, 0.35)", marginLeft: 4, fontSize: 12, verticalAlign: "middle", fontWeight: "normal" }}>(edited)</Text> */}
          </div>
        }
        tabList={tabList}
        tabProps={{size: 'small'}}
        activeTabKey={currentTab}
        onTabChange={key => setCurrentTab(key)}
        extra={ icon && <IconComponent onClick={ openModal } /> }
        actions={ [<br key={ 0 } />] }
      >
        { tabContents[currentTab] }
      </Card>
    </div>
  )
})

ConceptCard.propTypes = {
  result: PropTypes.object.isRequired,
  openModalHandler: PropTypes.func.isRequired,
}