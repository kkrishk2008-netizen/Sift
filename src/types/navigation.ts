import type { NavigatorScreenParams } from '@react-navigation/native';
import type { DraftItem, ExtractionResult } from './index';

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ImageScanner: undefined;
  VoiceDump: undefined;
  SharedMessage: { initialText?: string } | undefined;
  Result: { result: ExtractionResult };
  TaskDetail: { id?: string; draft?: Partial<DraftItem> } | undefined;
  Digest: undefined;
};

export type MainTabParamList = {
  Inbox: undefined;
  Capture: undefined;
  Calendar: undefined;
  Settings: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
