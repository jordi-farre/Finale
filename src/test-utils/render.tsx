import { render as rtlRender, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { paperLightTheme } from '@/theme/paper';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export async function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <PaperProvider theme={paperLightTheme}>{ui}</PaperProvider>
    </SafeAreaProvider>,
    options,
  );
}

export * from '@testing-library/react-native';
