import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Typography, Button, Space, Divider, Slider, Tooltip } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined, InfoCircleFilled } from '@ant-design/icons'
import { generate, presetPalettes, red, volcano, orange, gold, yellow, green, cyan, blue, geekblue, purple, magenta } from '@ant-design/colors'
import { Column } from '@ant-design/plots';
import chroma from 'chroma-js'
import { useHelxSearch } from '../../';
import {
    VariablesTableByStudy, variableHistogramConfigStatic,
    updateStudyResults, resetFilterPropertyToNone
} from './'
import { InfoTooltip } from '../../../';
import { useDebounce, useDebouncedCallback } from 'use-debounce'
import './variable-results.css';

const { Text, Title } = Typography

// Between 0-9
const COLOR_INTENSITY = 4
const GRADIENT_CONSTITUENTS = [
    gold[COLOR_INTENSITY], orange[COLOR_INTENSITY], volcano[COLOR_INTENSITY], red[COLOR_INTENSITY]
]
// const GRADIENT_CONSTITUENTS = [
//     cyan[COLOR_INTENSITY], blue[COLOR_INTENSITY], geekblue[COLOR_INTENSITY]
// ]
const COLOR_GRADIENT = chroma.scale(GRADIENT_CONSTITUENTS).mode("lrgb")

const DebouncedRangeSlider = ({ value, onChange, onInternalChange=() => {}, debounce=500, ...props }) => {
    const [_internalValue, setInternalValue] = useState(undefined)
    const [internalValue] = useDebounce(_internalValue, debounce)

    const internalOnChange = (range) => {
        setInternalValue(range)
    }

    useEffect(() => {
        setInternalValue(value)
    }, [value])

    useEffect(() => {
        onChange(internalValue)
    }, [internalValue])

    useEffect(() => {
        onInternalChange(_internalValue)
    }, [_internalValue])

    return (
        <Slider
            range
            value={ _internalValue }
            onChange={ internalOnChange }
            { ...props }
        />
    )
}

const HistogramLegendItem = ({ id, name: _name, description: _description, marker: _marker }) => {
    if (typeof _marker === "string") _marker = { path: _marker }
    const { path, style: markerStyle={} } = _marker
    if (typeof _name === "string") _name = { name: _name }
    const { name, style: nameStyle } = _name
    if (typeof _description === "string") _description = { description: _description }
    const { description, style: descriptionStyle } = _description
    const width = 48
    const height = 12

    const [hover, setHover] = useState(false)

    return (
        <div
            className="histogram-legend-item"
            onMouseOver={ () => setHover(true) }
            onMouseOut={ () => setHover(false) }
            style={{ display: "flex", flexDirection: "column", marginTop: 4 }}
        >
            <div style={{ display: "flex", alignItems: "center" }}>
                <svg style={{ width, height }}>
                    <path d={ path(width, height) } { ...markerStyle } />
                </svg>
                <Text style={{
                    marginLeft: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "rgba(0, 0, 0, 0.85)",
                    ...nameStyle
                }}>
                    { name }
                </Text>
            </div>
            { description && (
                <Text style={{
                    fontSize: 12,
                    color: "rgba(0, 0, 0, 0.45)",
                    ...descriptionStyle
                }}>
                    { description }
                </Text>
            ) }
        </div>
    )
}
const HistogramLegend = ({ title: _title, items, style, ...props }) =>  {
    if (typeof _title === "string") _title = { title: _title }
    const { title, style: titleStyle={} } = _title

    return (
        <div style={{ ...style }} { ...props }>
            { title && (
                <div style={{
                    marginBottom: 6,
                    textAlign: "start",
                    fontSize: 12,
                    textTransform: "uppercase",
                    // textDecoration: "underline",
                    letterSpacing: 0.25,
                    fontWeight: 600,
                    color: "rgba(0, 0, 0, 0.65)",
                    ...titleStyle
                }}>
                    { title }
                </div>
            ) }
            <div style={{ display: "flex", flexDirection: "column" }}>
                { items.map((item) => <HistogramLegendItem key={ item.id } { ...item } />) }
            </div>
        </div>
    )
}

/** Component that handles display of Variable Results */
export const VariableSearchResults = () => {
    const { variableResults, variableStudyResults, totalVariableResults } = useHelxSearch()

    const [page, setPage] = useState(0)
    /** filteredVariables holds the variables displayed in the histogram */
    const [_filteredVariables, _setFilteredVariables] = useState([variableResults])
    const filteredVariables = useMemo(() => _filteredVariables[page], [_filteredVariables, page])
    const setFilteredVariables = useCallback((value) => {
        const currentPage = _filteredVariables[page]
        const currentPageVariableIds = currentPage.map((variable) => variable.id)
        // If it's a duplicate of the current value, don't add it again.
        if (
            value.length === currentPage.length &&
            value.every((variable) => currentPageVariableIds.includes(variable.id))
        ) return
        // _filteredVariables.push(value)
        const newValue = [..._filteredVariables.slice(0, page + 1), value]
        _setFilteredVariables(newValue)
        setPage(newValue.length - 1)
    }, [_filteredVariables, page])
    const overrideFilterHistory = useCallback((value) => {
        _setFilteredVariables([value])
        setPage(0)
    }, [])

    /** noResults indicates that the search yielded no variables. The layout should be hidden. */
    const noResults = useMemo(() => totalVariableResults === 0, [totalVariableResults])

    const absScoreRange = useMemo(() => {
        // if (variableResults.length < 2) return undefined
        return [
            Math.min(...variableResults.map((result) => result.score)),
            Math.max(...variableResults.map((result) => result.score))   
        ]
    }, [variableResults])
    const scoreRange = useMemo(() => {
        // if (filteredVariables.length < 2) return undefined
        return [
            Math.min(...filteredVariables.map((result) => result.score)),
            Math.max(...filteredVariables.map((result) => result.score))
        ]
    }, [filteredVariables])

    const studyResultsForDisplay = useMemo(() => {
        const filteredIds = filteredVariables.map((result) => result.id)
        return variableStudyResults.filter((study) => study.elements.some((variable) => filteredIds.includes(variable.id)))
    }, [filteredVariables, variableStudyResults])
    
    /** useEffect added to address bug whereby displayed results were not updating when a new
     * search term was entered */
    useEffect(() => {
        // Basically, just reset the filteredVariables history back to new.
        overrideFilterHistory(variableResults);
    }, [variableResults, variableStudyResults]);

    /** studyNamesForDisplay holds names of user selected studies to highlight in histogram */
    const [studyNamesForDisplay, setStudyNamesForDisplay] = useState([])

    const variablesHistogram = useRef()
    const variableHistogramConfig = useMemo(() => {
        const [minScore, maxScore] = absScoreRange
        const hex = (x) => {
            x = x.toString(16)
            return (x.length === 1) ? '0' + x : x
        }
        // const absScoredVariables = filteredVariables.reduce((acc, variable) => {
        //     const absRatio = (variable.score - minScore) / (maxScore - minScore)
        //     const colorIdx = absRatio < 1 ? Math.floor((COLOR_GRADIENT.length - 1) * absRatio) : COLOR_GRADIENT.length - 2
        //     acc[variable.id] = {
        //         absRatio,
        //         colorIdx
        //     }
        //     return acc
        // }, {})
        // for (let colorIdx=0; colorIdx<COLOR_GRADIENT.length-1; colorIdx++) {
        //     const valuesInIdx = Object.values(absScoredVariables).filter(({ colorIdx: curIdx }) => colorIdx === curIdx)
        //     const minRatio = Math.min(...valuesInIdx.map((val) => val.absRatio))
        //     const maxRatio = Math.max(...valuesInIdx.map((val) => val.absRatio))
        //     valuesInIdx.forEach((val) => {
        //         val.relRatio = (val.absRatio - minRatio) / (maxRatio - minRatio)
        //     })
        //     console.log(valuesInIdx.length, minRatio, maxRatio)
        // }
        const clamp = (x, min, max) => Math.max(min, Math.min(x, max))
        return {
            ...variableHistogramConfigStatic,
            data: [...filteredVariables].sort((a, b) => a.score - b.score),
            color: ({ id }) => {
                const { score } = filteredVariables.find((result) => result.id === id)
                const absRatio = (score - minScore) / (maxScore - minScore)
                // const continuousRatio = ([...variableResults].sort((a, b) => a.score - b.score).findIndex((result) => result.id === id) + 1) / variableResults.length
                /**
                 * `continuousRatio` will create a continuous gradient across the histogram. This doesn't really indicate anything though, just looks pretty.
                 * `absRatio` is the norm of score between [minScore, maxScore] and will color the histogram against a gradient according to individual scores.
                 */
                return COLOR_GRADIENT(absRatio).toString()
            },
            /*seriesField: "id",
            legend: {
                layout: "vertical",
                position: "right-top",
                title: {
                    text: "Score Legend",
                    spacing: 12
                },
                offsetX : 24,
                custom: true,
                items: GRADIENT_CONSTITUENTS.map((color, i) => ({
                    id: color,
                    name: (() => {
                        const startRatio = Math.round(i / GRADIENT_CONSTITUENTS.length * 100) / 100
                        const endRatio = Math.round((i + 1) / GRADIENT_CONSTITUENTS.length * 100) / 100
                        const startScore = (startRatio * maxScore) - (startRatio * minScore) + minScore
                        const endScore = (endRatio * maxScore) - (endRatio   * minScore) + minScore
                        const count = variableResults.filter((result) => result.score >= startScore && result.score <= endScore).length
                        return `${ startRatio === 0 ? Math.floor(startScore) : Math.ceil(startScore) } - ${ endRatio === 1 ? Math.ceil(endScore) : Math.floor(endScore) }`
                    })(),
                    // value: "",
                    marker: {
                        spacing: 28,
                        style: {
                            fill: color
                        },
                        symbol: (x, y, r) => {
                            const x_r = 24
                            const y_r = 6
                            return [["M", x - x_r, y - y_r], ["L", x + x_r, y - y_r], ["L", x + x_r, y + y_r], ["L", x - x_r, y + y_r], ["Z"]]
                            // return [["M", x - r, y - r], ["L", x + r, y - r], ["L", x + r, y + r], ["L", x - r, y + r], ["Z"]]
                        }
                    }
                }))
            }*/
        }
    }, [filteredVariables, variableResults, absScoreRange])

    const [filteredPercentileLower, filteredPercentileUpper] = useMemo(() => {
        const relativeMin = Math.min(...filteredVariables.map((result) => result.score))
        const relativeMax = Math.max(...filteredVariables.map((result) => result.score))
        return [
            (variableResults.filter((result) => result.score <= relativeMin).length / variableResults.length) * 100,
            (variableResults.filter((result) => result.score <= relativeMax).length / variableResults.length) * 100
        ]
    }, [variableResults, filteredVariables])

    /**
     * Triggered by the Start Over button.
     */
    const startOverHandler = () => {
        /** Restores the variables shown in the histogram back to the original inputs */
        overrideFilterHistory(variableResults)

        /** Resets selected study names to none selected */
        setStudyNamesForDisplay([])

        let histogramObj = variablesHistogram.current.getChart()
        /** Removes 'active' state property, which allows bar highlighting when a study is selected */
        histogramObj.setState('active', () => true, false);
    }

    useEffect(() => {
        let histogramObj = variablesHistogram.current.getChart()
        /** Restores histogram data to refreshed value of filteredVariables, which is based on no filtering */
        histogramObj.update({ ...variableHistogramConfig, data: [...filteredVariables].sort((a, b) => a.score - b.score) })
    }, [variableHistogramConfig, filteredVariables])

    /** Update the highlighted variables whenever highlighted studies change or filtered variables change */
    useEffect(() => {
        const histogramObj = variablesHistogram.current.getChart()
        const variableIdsFilteredByStudy = studyNamesForDisplay.length > 0 ? (
            filteredVariables.filter(_var => studyNamesForDisplay.includes(_var.study_name)).map(el => el.id)
        ) : []
        histogramObj.setState("active", (d) => variableIdsFilteredByStudy.includes(d.id))
        histogramObj.setState("active", (d) => !variableIdsFilteredByStudy.includes(d.id), false)
    }, [studyNamesForDisplay, filteredVariables])

    /**
     * Whenever the brush filter is used, the value of filtered Variables &
     * studyResults gets updated based on the filteredData in the histogram
     */
    useEffect(() => {
        let histogramObj = variablesHistogram.current.getChart()
        const handle = (e) => {
            let newFilteredVariables = e.view.filteredData
            let updatedStudyResults = updateStudyResults(newFilteredVariables, studyResultsForDisplay);
            if (newFilteredVariables.length !== filteredVariables.length) {
                setFilteredVariables(newFilteredVariables)
            }
        }
        histogramObj.on('mouseup', handle)
        return () => {
            // Remove the click handler when the effect demounts.
            histogramObj.off('mouseup', handle)
        }
    }, [studyResultsForDisplay, filteredVariables])

    const onScoreSliderChange = useCallback((score) => {
        if (score === undefined || (score[0] === scoreRange[0] && score[1] === scoreRange[1])) return
        const [minScore, maxScore] = score
        const histogramObj = variablesHistogram.current.getChart()
        const newFilteredVariables = variableResults.filter((variable) => (
            variable.score >= minScore && variable.score <= maxScore
        ))
        let updatedStudyResults = updateStudyResults(newFilteredVariables, studyResultsForDisplay);
        if (filteredVariables.length !== newFilteredVariables.length) {
            setFilteredVariables(newFilteredVariables)
        }
    }, [variableResults, filteredVariables, studyResultsForDisplay, scoreRange])

    /**
     * Takes a studyName, selected by the user in the studies table & updates data going to
     * the histogram, to toggle highlighting of variables from the selected study.
     * 
     * Outcome:
     *  - Updates variable highlighting in histogram based on selected studies
     *  - Updates the contents of studyNamesForDisplay
     */
    function toggleStudyHighlightingInHistogram(studyName) {
        /** Check in studyName is in the array of studyNamesForDisplay, then either add or
         * remove the study.
        */
        let idx = studyNamesForDisplay.indexOf(studyName)
        let newStudyNamesForDisplay = [...studyNamesForDisplay]
        if (idx > -1) {
            newStudyNamesForDisplay.splice(idx, 1)
        } else {
            newStudyNamesForDisplay = [...newStudyNamesForDisplay, studyName]
        }
        setStudyNamesForDisplay(newStudyNamesForDisplay);
    }

    return (
        <div style={{ flexGrow: 1, display: noResults ? "none" : undefined }}>
            {/* The results header has a bottom margin of 16, so the divider shouldn't have a top margin. */}
            <Divider orientation="left" orientationMargin={ 0 } style={{
                marginTop: 0,
                marginBottom: 16,
                fontSize: 18,
                fontWeight: 500
            }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    Variables according to Dug score
                    <InfoTooltip title={
                        <div style={{ padding: "4px 2px" }}>
                            <div style={{ fontWeight: 500, textDecoration: "underline" }}>
                                Dug score
                            </div>
                            <ul style={{ marginTop: 2, marginBottom: 2, paddingLeft: 16 }}>
                            <li>
                                This is the metric used by Dug to describe how relevant a result is
                            </li>
                            <li>
                                The score is calculated from how closely the search query matches information known about a result
                            </li></ul>
                        </div>
                    } iconProps={{ style: { marginLeft: 8 } }} />
                </div>
            </Divider>
            { filteredVariables.length < totalVariableResults && (
                <div style={{ marginTop: -8, marginBottom: 16 }}>
                    <Text type="secondary">
                        Viewing {filteredVariables.length} variables within the {Math.floor(filteredPercentileLower)}-{Math.floor(filteredPercentileUpper)} percentiles
                    </Text>
                </div>
            ) }
            <Space direction="vertical" size="middle">
                <div style={{ display: "flex" }}>
                    <div style={{ flexGrow: 1, width: 0 }}>
                        <Column
                            {...variableHistogramConfig}
                            style={{ padding: 0 }}
                            ref={variablesHistogram}
                        />
                        <DebouncedRangeSlider
                            value={ scoreRange }
                            onChange={ onScoreSliderChange }
                            min={ Math.min(...variableResults.map((result) => result.score)) }
                            max={ Math.max(...variableResults.map((result) => result.score)) }
                            step={ null }
                            marks={ variableResults.reduce((acc, cur) => {
                                acc[cur.score] = {
                                    label: cur.score,
                                    style: {
                                        display: "none"
                                    }
                                }
                                return acc
                            }, {}) }
                            // Margin to align with the histogram
                            style={{ marginRight: 0, marginBottom: 4, marginTop: 16, flexGrow: 1 }}
                            className="histogram-slider"
                        />
                    </div>
                    <HistogramLegend
                        title={{
                            title: "Score Legend"
                        }}
                        items={ GRADIENT_CONSTITUENTS.map((color, i) => {
                            const [minScore, maxScore] = absScoreRange
                            const startRatio = Math.round(i / GRADIENT_CONSTITUENTS.length * 100) / 100
                            const endRatio = Math.round((i + 1) / GRADIENT_CONSTITUENTS.length * 100) / 100
                            const startScore = (startRatio * maxScore) - (startRatio * minScore) + minScore
                            const endScore = (endRatio * maxScore) - (endRatio   * minScore) + minScore
                            const count = variableResults.filter((result) => result.score >= startScore && result.score <= endScore).length
                            const filteredCount = filteredVariables.filter((result) => result.score >= startScore && result.score <= endScore).length
                            return {
                                id: color,
                                name: {
                                    name: `${ startRatio === 0 ? Math.floor(startScore) : Math.ceil(startScore) } - ${ endRatio === 1 ? Math.ceil(endScore) : Math.floor(endScore) }`,
                                    style: filteredCount === 0 ? { color: "rgba(0, 0, 0, 0.25)" } : undefined
                                },
                                description: {
                                    description: filteredCount < count ? `(${ filteredCount } / ${ count } variables)` : `(${ count } variables)`,
                                    style: filteredCount === 0 ? { color: "rgba(0, 0, 0, 0.25)" } : undefined
                                },
                                marker: {
                                    path: (w, h) => {
                                        const x = 0
                                        const y = 0
                                        return `M ${ x },${ y } L ${ x + w }, ${ y } L ${ x + w }, ${ y + h } L ${ x }, ${ y + h } L ${ x },${ y } Z`
                                    },
                                    // path: [["M", x - x_r, y - y_r], ["L", x + x_r, y - y_r], ["L", x + x_r, y + y_r], ["L", x - x_r, y + y_r], ["Z"]],
                                    style: {
                                        fill: filteredCount > 0 ? color : "rgba(0, 0, 0, 0.15)"
                                    }
                                }
                            }
                        }) }
                        style={{ marginLeft: 24, marginRight: 8, flexShrink: 0 }}
                    />
                </div>
                <div style={{ display: "flex" }}>
                    <Tooltip title="Reset zoom/push-pins">
                        <Button onClick={ startOverHandler }>
                            Start Over
                        </Button>
                    </Tooltip>
                    <Tooltip title="Undo zoom">
                    <Button onClick={ () => setPage(page - 1) } disabled={ page === 0 } style={{ marginLeft: 4 }}>
                        <ArrowLeftOutlined />
                    </Button>
                    </Tooltip>
                    <Tooltip title="Redo zoom">
                        <Button onClick={ () => setPage(page + 1) } disabled={ page === _filteredVariables.length - 1 } style={{ marginLeft: 4 }}>
                            <ArrowRightOutlined />
                        </Button>
                    </Tooltip>
                </div>
            </Space>
            <Divider orientation="left" orientationMargin={ 0 } style={{ fontSize: 15, marginTop: 24, marginBottom: 0 }}>Studies</Divider>
            { studyResultsForDisplay.length < variableStudyResults.length && (
                <div style={{ marginTop: 6, marginBottom: -4 }}>
                    <Text type="secondary" style={{ fontSize: 14, fontStyle: "italic" }}>
                        Showing { studyResultsForDisplay.length } of { variableStudyResults.length } studies
                    </Text>
                </div>
            ) }
            <Space direction="vertical" style={{ marginTop: 8 }}>
                <div className='list'>
                    <VariablesTableByStudy
                        studyResultsForDisplay={studyResultsForDisplay}
                        studyNamesForDisplay={studyNamesForDisplay}
                        filteredVariables={filteredVariables}
                        toggleStudyHighlightingInHistogram={toggleStudyHighlightingInHistogram}/>
                </div>
            </Space>
        </div>
    )
}