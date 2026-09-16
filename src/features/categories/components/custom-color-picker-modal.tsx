import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import ColorPicker, {
  HueSlider,
  Panel1,
  Preview,
} from 'reanimated-color-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';

const palette = {
  backdrop: 'rgba(35, 40, 31, 0.42)',
  border: '#E4DAC9',
  ink: '#303A29',
  muted: '#89897F',
  oliveDark: '#4E5C39',
  olivePale: '#E5E7DB',
  surface: '#FEFCF7',
  white: '#FFFDF8',
} as const;

type CustomColorPickerModalProps = {
  color: string;
  onApply: (color: string) => void;
  onClose: () => void;
  subtitle?: string;
};

function normalizeHexColor(color: string) {
  return color.slice(0, 7).toUpperCase();
}

export function CustomColorPickerModal({
  color,
  onApply,
  onClose,
  subtitle = 'Elige el tono para tu categoría',
}: CustomColorPickerModalProps) {
  const [draftColor, setDraftColor] = useState(color);

  function handleClose() {
    setDraftColor(color);
    onClose();
  }

  function handleApply() {
    onApply(draftColor);
    onClose();
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
      transparent
      visible>
      <Pressable
        accessibilityLabel="Cancelar selección de color personalizado"
        accessibilityRole="button"
        onPress={handleClose}
        style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <Pressable
            accessibilityViewIsModal
            onPress={(event) => event.stopPropagation()}
            style={styles.card}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <ThemedText style={styles.title}>Color personalizado</ThemedText>
                <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
              </View>
              <Pressable
                accessibilityLabel="Cerrar selector de color"
                accessibilityRole="button"
                hitSlop={10}
                onPress={handleClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <SymbolView
                  name={{ android: 'close', ios: 'xmark', web: 'close' }}
                  size={20}
                  tintColor={palette.muted}
                />
              </Pressable>
            </View>

            <ColorPicker
              boundedThumb
              colorAnnouncementFormat="hex"
              onCompleteJS={({ hex }) => setDraftColor(normalizeHexColor(hex))}
              style={styles.picker}
              thumbSize={26}
              value={draftColor}>
              <Preview
                colorFormat="hex"
                disableOpacityTexture
                hideInitialColor
                style={styles.preview}
                textStyle={styles.previewText}
              />
              <Panel1
                accessibilityHint="Desliza para ajustar saturación y brillo"
                accessibilityLabel="Saturación y brillo"
                style={styles.colorPanel}
              />
              <View style={styles.hueSection}>
                <ThemedText style={styles.hueLabel}>Tono</ThemedText>
                <HueSlider
                  accessibilityHint="Desliza para cambiar el tono"
                  accessibilityLabel="Tono del color"
                  sliderThickness={28}
                  style={styles.hueSlider}
                />
              </View>
            </ColorPicker>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleClose}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleApply}
                style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}>
                <ThemedText style={styles.applyButtonText}>Aplicar</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: palette.backdrop,
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 8,
    gap: Spacing.three,
    maxWidth: 430,
    padding: Spacing.four,
    shadowColor: palette.ink,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    width: '100%',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
  },
  subtitle: {
    color: palette.muted,
    fontFamily: Fonts.serif,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  picker: {
    gap: 14,
    width: '100%',
  },
  preview: {
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 52,
  },
  previewText: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    fontWeight: '600',
  },
  colorPanel: {
    borderRadius: 16,
    height: 205,
  },
  hueSection: {
    gap: 7,
  },
  hueLabel: {
    color: palette.muted,
    fontFamily: Fonts.serif,
    fontSize: 14,
    lineHeight: 20,
  },
  hueSlider: {
    borderRadius: 14,
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: palette.olivePale,
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: Spacing.three,
  },
  cancelButtonText: {
    color: palette.oliveDark,
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    alignItems: 'center',
    backgroundColor: palette.oliveDark,
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: Spacing.three,
  },
  applyButtonText: {
    color: palette.white,
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.68,
  },
});
