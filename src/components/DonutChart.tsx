import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';

interface DonutChartProps {
  incoming: number;
  outgoing: number;
  missed: number;
  rejected: number;
  size?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  incoming,
  outgoing,
  missed,
  rejected,
  size = 200,
}) => {
  const total = incoming + outgoing + missed + rejected;
  
  if (total === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={(size / 2) - 20}
            stroke="#E0E0E0"
            strokeWidth={40}
            fill="transparent"
          />
        </Svg>
      </View>
    );
  }

  const incomingPercent = (incoming / total) * 100;
  const outgoingPercent = (outgoing / total) * 100;
  const missedPercent = (missed / total) * 100;
  const rejectedPercent = (rejected / total) * 100;

  const radius = (size / 2) - 20;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate stroke dash arrays for each segment
  const incomingDash = (incomingPercent / 100) * circumference;
  const outgoingDash = (outgoingPercent / 100) * circumference;
  const missedDash = (missedPercent / 100) * circumference;
  const rejectedDash = (rejectedPercent / 100) * circumference;

  // Calculate rotation for each segment
  let rotation = -90; // Start at top

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation={rotation} origin={`${center}, ${center}`}>
          {/* Incoming - Green */}
          {incoming > 0 && (
            <>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#8BC34A"
                strokeWidth={40}
                fill="transparent"
                strokeDasharray={`${incomingDash} ${circumference}`}
                strokeLinecap="round"
              />
              {incomingPercent >= 10 && (
                <SvgText
                  x={center + radius * 0.6}
                  y={center - radius * 0.3}
                  fill="white"
                  fontSize="16"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {Math.round(incomingPercent)}%
                </SvgText>
              )}
            </>
          )}
        </G>

        <G rotation={rotation + (incomingPercent / 100) * 360} origin={`${center}, ${center}`}>
          {/* Outgoing - Orange */}
          {outgoing > 0 && (
            <>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#FFA000"
                strokeWidth={40}
                fill="transparent"
                strokeDasharray={`${outgoingDash} ${circumference}`}
                strokeLinecap="round"
              />
              {outgoingPercent >= 10 && (
                <SvgText
                  x={center + radius * 0.6}
                  y={center - radius * 0.3}
                  fill="white"
                  fontSize="16"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {Math.round(outgoingPercent)}%
                </SvgText>
              )}
            </>
          )}
        </G>

        <G rotation={rotation + ((incomingPercent + outgoingPercent) / 100) * 360} origin={`${center}, ${center}`}>
          {/* Missed - Red */}
          {missed > 0 && (
            <>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#E57373"
                strokeWidth={40}
                fill="transparent"
                strokeDasharray={`${missedDash} ${circumference}`}
                strokeLinecap="round"
              />
              {missedPercent >= 10 && (
                <SvgText
                  x={center + radius * 0.6}
                  y={center - radius * 0.3}
                  fill="white"
                  fontSize="16"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {Math.round(missedPercent)}%
                </SvgText>
              )}
            </>
          )}
        </G>

        <G rotation={rotation + ((incomingPercent + outgoingPercent + missedPercent) / 100) * 360} origin={`${center}, ${center}`}>
          {/* Rejected - Gray */}
          {rejected > 0 && (
            <>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#9E9E9E"
                strokeWidth={40}
                fill="transparent"
                strokeDasharray={`${rejectedDash} ${circumference}`}
                strokeLinecap="round"
              />
              {rejectedPercent >= 10 && (
                <SvgText
                  x={center + radius * 0.6}
                  y={center - radius * 0.3}
                  fill="white"
                  fontSize="16"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {Math.round(rejectedPercent)}%
                </SvgText>
              )}
            </>
          )}
        </G>

        {/* Inner white circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius - 40}
          fill="white"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
