import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../theme/colors';
import { HourlyData } from '../utils/analyticsUtils';

interface BarChartProps {
  data: HourlyData[];
  height?: number;
}

const CHART_HEIGHT = 200;
const BAR_WIDTH = 40;

export const BarChart: React.FC<BarChartProps> = ({ data, height = CHART_HEIGHT }) => {
  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noData}>No data available</Text>
      </View>
    );
  }

  // Find max value for scaling
  const maxValue = Math.max(
    ...data.map(d => d.incoming + d.outgoing + d.missed + d.rejected),
    1
  );

  return (
    <View style={styles.container}>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#8BC34A' }]} />
          <Text style={styles.legendText}>Incoming</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FFA000' }]} />
          <Text style={styles.legendText}>Outgoing</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E57373' }]} />
          <Text style={styles.legendText}>Missed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#9E9E9E' }]} />
          <Text style={styles.legendText}>Rejected</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={[styles.chartContainer, { height }]}>
        {data.map((item, index) => {
          const total = item.incoming + item.outgoing + item.missed + item.rejected;
          const barHeight = (total / maxValue) * (height - 40);

          return (
            <View key={index} style={styles.barGroup}>
              <View style={[styles.barContainer, { height: height - 40 }]}>
                {total > 0 && (
                  <View style={[styles.bar, { height: barHeight }]}>
                    {/* Stacked segments */}
                    {item.incoming > 0 && (
                      <View
                        style={[
                          styles.segment,
                          {
                            height: `${(item.incoming / total) * 100}%`,
                            backgroundColor: '#8BC34A',
                          },
                        ]}
                      />
                    )}
                    {item.outgoing > 0 && (
                      <View
                        style={[
                          styles.segment,
                          {
                            height: `${(item.outgoing / total) * 100}%`,
                            backgroundColor: '#FFA000',
                          },
                        ]}
                      />
                    )}
                    {item.missed > 0 && (
                      <View
                        style={[
                          styles.segment,
                          {
                            height: `${(item.missed / total) * 100}%`,
                            backgroundColor: '#E57373',
                          },
                        ]}
                      />
                    )}
                    {item.rejected > 0 && (
                      <View
                        style={[
                          styles.segment,
                          {
                            height: `${(item.rejected / total) * 100}%`,
                            backgroundColor: '#9E9E9E',
                          },
                        ]}
                      />
                    )}
                  </View>
                )}
              </View>
              <Text style={styles.hourLabel}>{item.hour}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barGroup: {
    alignItems: 'center',
    width: BAR_WIDTH,
  },
  barContainer: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 30,
    borderRadius: 4,
    overflow: 'hidden',
  },
  segment: {
    width: '100%',
  },
  hourLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 6,
    transform: [{ rotate: '-45deg' }],
  },
  noData: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
});
