import { Fragment, useCallback, useMemo, useState, useRef } from 'react'
import axios from 'axios'
import { Button, Divider, Input, Spin, Typography } from 'antd'
import { useHelxSearch } from '../../'
import { Link } from '../../../link'
import { RocketOutlined as QueryIcon } from '@ant-design/icons'
import { SizeMe } from 'react-sizeme'
import { useDebounce } from 'use-debounce'
import './tranql.css'

axios.defaults.timeout = 30000

const { Text, Title  } = Typography
const { TextArea } = Input

export const TranQLTab = ({ result, graphs }) => {
  const { query } = useHelxSearch()
  const tranqlUrl = "http://localhost:3000"

  const makeTranqlQuery = () => {
    const tranqlQueries = graphs.map(({ knowledge_graph, question_graph, knowledge_map }) => {
      // Each question_graph has one edge and two nodes.
      const [ edge ] = question_graph.edges
      const [ n1, n2 ] = question_graph.nodes
      const boundNodes = question_graph.nodes.filter((n) => n.hasOwnProperty("curie"))
      const SELECT = `SELECT ${edge.source_id}->${edge.target_id}`
      const FROM = `FROM "/schema"`
      // Not entirely sure if DUG can return multiple bound nodes, so implementing it just in case it's possible.
      const WHERE = "WHERE " + boundNodes.map((n) => `${n.id}="${n.curie}"`).join(" AND ")
      const query = `${SELECT}
  ${FROM}
 ${WHERE}`
      return query;
    }).reduce((acc, cur) => {
      // Remove duplicate queries
      if (!acc.includes(cur)) acc.push(cur)
      return acc
    }, []);
    // Right now, TranQL only seems? to support one query at once (i.e., one SELECT statement per query is allowed)
    // so just use the first query that's there.
    return tranqlQueries[0]
  }

  const initialTranqlQuery = useMemo(makeTranqlQuery, [result, graphs])
  const [tranqlQuery, setTranqlQuery] = useState(initialTranqlQuery)
  const [debouncedQuery] = useDebounce(tranqlQuery, 250)

  const [iframeLoading, setIframeLoading] = useState(true)

  const tranqlIframe = useRef(null);

  const handleChangeTranqlQuery = event => {
    setTranqlQuery(event.target.value)
  }

  return (
    <Fragment>
      {/* <TextArea className="tranql-query-textarea" value={ tranqlQuery } onChange={ handleChangeTranqlQuery } /> */}
      
      {/* <br /><br /> */}
      { /* <Link to={ `https://heal.renci.org/tranql/?q=${ encodeURI(tranqlQuery) }` }>View in TranQL</Link> */ }
      {/* <br /> */}
      
      {/* <Divider /> */}
      {
        debouncedQuery === undefined ? (
          <>
          <Title level={ 4 }>TranQL</Title>
          <Text>No query could be constructed from the result.</Text>
          </>
        ) : (
          <SizeMe>
            {
              ({ size }) => (
                <iframe src={`${tranqlUrl}?embed=FULL&q=${encodeURIComponent(debouncedQuery)}`}
                        height="665" width={size.width}
                        ref={tranqlIframe}
                        onLoad={() => setIframeLoading(false)}
                />
              )
            }
          </SizeMe>
        )
      }
    </Fragment>
  )
}
