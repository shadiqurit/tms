import { ArrowLeftRight, BriefcaseBusiness, Building2, ChartNoAxesCombined, Circle, CircleDollarSign, Database, FileClock, Files, FolderKanban, HandCoins, HardHat, Landmark, LayoutDashboard, ListTree, MapPinned, PanelLeft, ReceiptText, Settings2, ShieldCheck, ShoppingBag, ShoppingCart, Truck, UserRoundCog, UsersRound, WalletCards, } from 'lucide-vue-next';
import { computed } from 'vue';
const props = withDefaults(defineProps(), { size: 18 });
const iconMap = {
    ArrowLeftRight, BriefcaseBusiness, Building2, ChartNoAxesCombined, Circle,
    CircleDollarSign, Database, FileClock, Files, FolderKanban, HandCoins, HardHat,
    Landmark, LayoutDashboard, ListTree, MapPinned, PanelLeft, ReceiptText, Settings2,
    ShieldCheck, ShoppingBag, ShoppingCart, Truck, UserRoundCog, UsersRound, WalletCards,
};
const icon = computed(() => iconMap[props.name] ?? Circle);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({ size: 18 });
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = ((__VLS_ctx.icon));
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (__VLS_ctx.size),
    strokeWidth: (1.8),
    'aria-hidden': "true",
}));
const __VLS_2 = __VLS_1({
    size: (__VLS_ctx.size),
    strokeWidth: (1.8),
    'aria-hidden': "true",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
var __VLS_3;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            icon: icon,
        };
    },
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
