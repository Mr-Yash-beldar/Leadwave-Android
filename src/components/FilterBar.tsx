import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff } from 'lucide-react-native';

interface FilterBarProps {
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
}

const filters = [
  { id: 'all', label: 'All Calls', icon: Phone },
  { id: 'incoming', label: 'Incoming', icon: PhoneIncoming },
  { id: 'outgoing', label: 'Outgoing', icon: PhoneOutgoing },
  { id: 'missed', label: 'Missed', icon: PhoneMissed },
  { id: 'rejected', label: 'Rejected', icon: PhoneOff },
];

export const FilterBar: React.FC<FilterBarProps> = ({ selectedFilter, onSelectFilter }) => {
  const scrollRef = React.useRef<ScrollView>(null);

  React.useEffect(() => {
    const index = filters.findIndex(f => f.id === selectedFilter);
    if (index !== -1) {
      scrollRef.current?.scrollTo({ x: Math.max(0, index * 80 - 40), animated: true });
    }
  }, [selectedFilter]);

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollRef}
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isSelected = selectedFilter === filter.id;
          return (
            <TouchableOpacity 
              key={filter.id} 
              style={styles.filterItem}
              onPress={() => onSelectFilter(filter.id)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon 
                  size={24} 
                  color={isSelected ? colors.black : '#9E9E9E'} 
                />
              </View>
              <Text style={[styles.label, isSelected && styles.labelActive]}>
                {filter.label}
              </Text>
              {isSelected && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  filterItem: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 70,
  },
  iconContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  labelActive: {
    color: colors.black,
    fontWeight: 'bold',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.black,
    marginTop: 4,
  },
});
