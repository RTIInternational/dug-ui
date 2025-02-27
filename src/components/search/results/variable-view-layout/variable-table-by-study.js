import React, { useEffect, useState, useRef, useMemo, Fragment } from 'react'
import { Collapse, List, Typography, Button, Space, Divider, Tooltip } from 'antd'
import {
    PushpinOutlined as UnselectedIcon,
    PushpinFilled as SelectedIcon,
} from '@ant-design/icons'
const { Text } = Typography
const { Panel } = Collapse

const VariableList = ({ study, filteredVariables }) => {
    return (
        <List
            className="study-variables-list"
            dataSource={study.elements}
            renderItem={variable => (
                <div className={`study-variables-list-item within-filter-${ !!filteredVariables.find((result) => result.id === variable.id) }`} style={{ borderLeft: "none" }}>
                    <Text className="variable-name">
                        {variable.name}&nbsp;
                        ({variable.e_link ? <a href={variable.e_link}>{variable.id}</a> : variable.id})
                    </Text><br />
                    <Text className="variable-description"> {variable.description}</Text>
                </div>
            )}
        />
    )
}

const VariablePanel = ({ study, filteredVariables, selected, onSelect }) => {
    const [collapsed, setCollapsed] = useState(true)
    return (
        <Fragment>
        <Collapse ghost activeKey={collapsed ? null : `panel_${study.c_name}`} onChange={ () => setCollapsed(!collapsed) }>
            <Panel
                key={`panel_${study.c_name}`}
                className={ [
                    'study-panel ',
                    selected ? 'selected' : 'unselected',
                ] }
                header={
                    <span className="study-panel-header">
                        <Text>{study.c_name}{` `}</Text>
                        <Tooltip title="Highlight variables from study" align={{ offset: [ 0, 4 ] }}>
                            <Button
                                type="link"
                                className="study-selection-button"
                                onClick={ (e) => (e.stopPropagation(), onSelect()) }
                            >
                            {
                                selected
                                    ? <SelectedIcon />
                                    : <UnselectedIcon />
                            }
                            </Button>
                        </Tooltip>
                    </span>
                }
                extra={ [
                    <Text key={`text_${study.c_name}`}
                    >{study.elements.length} variable{study.elements.length === 1 ? '' : 's'}</Text>,
                ] }
            >
                <div id={ `scrollableDiv__${study.c_id}` } className="scrollable-div">
                    <VariableList study={ study } filteredVariables={ filteredVariables } />
                </div>
            </Panel>
        </Collapse>
        </Fragment>
    )
}

export const VariablesTableByStudy = ({studyResultsForDisplay, studyNamesForDisplay, filteredVariables, toggleStudyHighlightingInHistogram}) => {
    return (
        <div className="variables-collapse">
            {
                studyResultsForDisplay.map((study, i) => {
                    return (
                        <VariablePanel
                            key = { study.c_id }
                            study={ study }
                            filteredVariables={ filteredVariables }
                            selected={ studyNamesForDisplay.includes(study.c_name) }
                            onSelect={ () => toggleStudyHighlightingInHistogram(study.c_name) }
                        />   
                    )
                })
            }
        </div>
    )
}
