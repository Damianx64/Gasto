import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { getCategoryIconOption } from '../constants';

type CategoryIconProps = {
  backgroundColor?: string;
  color?: string | null;
  iconColor?: string;
  iconKey?: string | null;
  size?: number;
  symbolSize?: number;
};

const fallbackColor = '#8B919B';

export function CategoryIcon({
  backgroundColor,
  color,
  iconColor = '#ffffff',
  iconKey,
  size = 36,
  symbolSize = 20,
}: CategoryIconProps) {
  const icon = getCategoryIconOption(iconKey);

  return (
    <View
      accessible={false}
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor || color || fallbackColor,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}>
      <SymbolView name={icon.symbol} size={symbolSize} tintColor={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
