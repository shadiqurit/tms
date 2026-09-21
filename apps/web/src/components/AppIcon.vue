<script setup lang="ts">
import {
  ArrowLeftRight,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  Circle,
  CircleDollarSign,
  Database,
  FileClock,
  Files,
  FolderKanban,
  HandCoins,
  HardHat,
  Landmark,
  LayoutDashboard,
  ListTree,
  MapPinned,
  PanelLeft,
  ReceiptText,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Truck,
  UserRoundCog,
  UsersRound,
  WalletCards,
} from 'lucide-vue-next';
import { computed } from 'vue';

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 18 });
const iconMap = {
  ArrowLeftRight, BriefcaseBusiness, Building2, ChartNoAxesCombined, Circle,
  CircleDollarSign, Database, FileClock, Files, FolderKanban, HandCoins, HardHat,
  Landmark, LayoutDashboard, ListTree, MapPinned, PanelLeft, ReceiptText, Settings2,
  ShieldCheck, ShoppingBag, ShoppingCart, Truck, UserRoundCog, UsersRound, WalletCards,
} as const;
const icon = computed(() => iconMap[props.name as keyof typeof iconMap] ?? Circle);
</script>

<template><component :is="icon" :size="size" :stroke-width="1.8" aria-hidden="true" /></template>
