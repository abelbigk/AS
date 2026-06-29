import type { ContentItem } from "@/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  CategoryDetail: { categoryId: number; status?: "queued" | "done" };
  SubcategoryDetail: { subcategoryId: number; status?: "queued" | "done" };
  AddContent: { categoryId?: number; subcategoryId?: number };
  AddSubcategory: { categoryId: number };
  EditContent: { itemId: number };
  ContentDetail: { item: ContentItem; categoryId?: number; subcategoryId?: number };
};

export type TabParamList = {
  Home: undefined;
  Queued: undefined;
  Done: undefined;
  Add: undefined;
  Settings: undefined;
};

export type RootStackProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type TabProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
