import React, { useContext, useState, useEffect, useRef } from 'react';
import { animated, useTransition, interpolate } from 'react-spring';
import ReactTooltip from 'react-tooltip';

import Pie, { ProvidedProps, PieArcDatum } from '@visx/shape/lib/shapes/Pie';
import { Group } from '@visx/group';
import { Text } from '@visx/text';

import Context from '../context';

import ErrorBoundary from '@cdc/core/components/ErrorBoundary';

// react-spring transition definitions
type PieStyles = { startAngle: number; endAngle: number };

const enterUpdateTransition = ({ startAngle, endAngle }: PieArcDatum<any>) => ({
  startAngle,
  endAngle,
});

export default function PieChart() {
  const { data, config, dimensions, seriesHighlight, colorScale, formatNumber, currentViewport } = useContext<any>(Context);

  const [filteredData, setFilteredData] = useState<any>(undefined);

  type AnimatedPieProps<Datum> = ProvidedProps<Datum> & {
    animate?: boolean;
    getKey: (d: PieArcDatum<Datum>) => string;
    delay?: number;
  };
  
  function AnimatedPie<Datum>({
    arcs,
    path,
    getKey,
  }: AnimatedPieProps<Datum>) {
    const transitions = useTransition<PieArcDatum<Datum>, PieStyles>(
      arcs,
      getKey,
      // @ts-ignore react-spring doesn't like this overload
      {
        from: enterUpdateTransition,
        enter: enterUpdateTransition,
        update: enterUpdateTransition,
        leave: enterUpdateTransition,
      },
    );
    return (
      <>
        {transitions.map(
          ({
            item: arc,
            props,
            key,
          }: {
            item: PieArcDatum<Datum>;
            props: PieStyles;
            key: string;
          }) => {
            return (
              <Group key={key} style={{ opacity: (config.legend.highlight && seriesHighlight.length > 0 && seriesHighlight.indexOf((arc.data as any).name) === -1) ? 0.5 : 1 }}>
                <animated.path
                  // compute interpolated path d attribute from intermediate angle values
                  d={interpolate([props.startAngle, props.endAngle], (startAngle, endAngle) => path({
                    ...arc,
                    startAngle,
                    endAngle,
                  }))}
                  fill={colorScale((arc.data as any).name)}
                  data-tip={`<div>
                    ${config.xAxis.label}: ${(arc.data as any).name} <br/>
                    ${config.yAxis.label}: ${formatNumber(arc.data[config.yAxis.dataKey])}
                  </div>`}
                  data-for="global"
                />
              </Group>
            );
          },
        )}
        {transitions.map(
          ({
            item: arc,
            key,
          }: {
            item: PieArcDatum<Datum>;
            props: PieStyles;
            key: string;
          }) => {
            const [centroidX, centroidY] = path.centroid(arc);
            const hasSpaceForLabel = arc.endAngle - arc.startAngle >= 0.1;

            return (
              <animated.g key={key}>
                {hasSpaceForLabel && (
                  
                    <Text
                      fill="white"
                      x={centroidX}
                      y={centroidY}
                      dy=".33em"
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      {Math.round((arc.endAngle - arc.startAngle) * 180 / Math.PI / 360 * 100) + '%'}
                    </Text>
                )}
              </animated.g>
            );
          },
        )}
      </>
    );
  }

  let [ width ] = dimensions;

  if(!config.legend.hide && currentViewport === 'lg') {
    width = width * 0.73
  }

  width -= (config.padding.left + config.padding.right);

  const height = config.aspectRatio ? (width * config.aspectRatio) : config.height;

  const radius = Math.min(width, height) / 2;
  const centerY = height / 2;
  const centerX = width / 2;
  const donutThickness = radius;

  useEffect(() => {
    if(seriesHighlight.length > 0 && !config.legend.highlight){
      let newFilteredData = [];

      data.forEach((d) => {
        if(seriesHighlight.indexOf(d[config.xAxis.dataKey]) !== -1) {
          newFilteredData.push(d);
        }
      });

      setFilteredData(newFilteredData);
    } else {
      setFilteredData(undefined);
    }
  }, [seriesHighlight]);

  return (
    <ErrorBoundary component="PieChart">
      <svg width={width} height={height}>
        <Group top={centerY} left={centerX}>
          <Pie
            data={filteredData || data}
            pieValue={d => d[config.yAxis.dataKey]}
            pieSortValues={() => -1}
            innerRadius={radius - donutThickness}
            outerRadius={radius}
          >
            {pie => (
              <AnimatedPie<any>
                {...pie}
                getKey={d => d.data[config.xAxis.dataKey]}
              />
            )}
          </Pie>
        </Group>
      </svg>
      <ReactTooltip id="global" html={true} type="light" arrowColor="rgba(0,0,0,0)" className="tooltip"/>
    </ErrorBoundary>
  )
}
