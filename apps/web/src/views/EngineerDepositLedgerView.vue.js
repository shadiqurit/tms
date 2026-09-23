import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowDownToLine, ArrowLeft, BanknoteArrowDown, ChevronLeft, ChevronRight, CircleDollarSign, Download, PackageSearch, Pencil, Plus, Search, Trash2, WalletCards, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { addDemoEngineerDeposit, deleteDemoEngineerDeposit, getDemoEngineerLedger, updateDemoEngineerDeposit } from '../data/engineerDeposits';
import { projectSites } from '../data/projectSites';
const route = useRoute();
const auth = useAuthStore();
const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false';
const employeeId = Number(route.params.employeeId);
const projectId = Number(route.params.projectId);
const ledger = ref(null);
const transactions = ref([]);
const sites = ref(projectSites.filter((item) => item.projectId === projectId).map((item) => ({ id: item.id, projectId: item.projectId, name: item.name })));
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const formError = ref('');
const showForm = ref(false);
const editingId = ref(null);
const search = ref('');
const typeFilter = ref('all');
const page = ref(1);
const pageSize = 30;
const today = new Date().toISOString().slice(0, 10);
const form = reactive({ employeeId, projectId, siteId: null, depositDate: today, amount: 0, referenceNo: '', notes: '' });
const canManage = computed(() => auth.hasPermission('engineer_deposits.manage'));
const canDelete = computed(() => auth.hasPermission('engineer_deposits.delete'));
const filtered = computed(() => { const term = search.value.trim().toLowerCase(); return transactions.value.filter((item) => (typeFilter.value === 'all' || item.type === typeFilter.value) && (!term || [item.referenceNo, item.description, item.notes, item.siteName, item.transactionDate].some((value) => String(value ?? '').toLowerCase().includes(term)))); });
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const counts = computed(() => ({ deposits: transactions.value.filter((item) => item.type === 'deposit').length, materials: transactions.value.filter((item) => item.type === 'material').length, expenses: transactions.value.filter((item) => item.type === 'expense').length }));
watch([search, typeFilter], () => { page.value = 1; });
onMounted(load);
async function load() {
    loading.value = true;
    error.value = '';
    try {
        if (demoMode) {
            const result = getDemoEngineerLedger(employeeId, projectId);
            ledger.value = result.ledger;
            transactions.value = result.transactions;
        }
        else {
            const [result, options] = await Promise.all([
                api(`/engineer-deposits/ledger?employeeId=${employeeId}&projectId=${projectId}`),
                api('/engineer-deposits/options'),
            ]);
            ledger.value = result.ledger;
            transactions.value = result.transactions;
            sites.value = options.sites.filter((item) => item.projectId === projectId);
        }
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load the engineer ledger.';
    }
    finally {
        loading.value = false;
    }
}
function money(value) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value)); }
function date(value) { return value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Date not recorded'; }
function openNew() { editingId.value = null; Object.assign(form, { employeeId, projectId, siteId: null, depositDate: today, amount: 0, referenceNo: '', notes: '' }); formError.value = ''; showForm.value = true; }
function openEdit(item) { editingId.value = item.id; Object.assign(form, { employeeId, projectId, siteId: item.siteId, depositDate: item.transactionDate ?? '', amount: item.credit, referenceNo: item.referenceNo ?? '', notes: item.notes ?? '' }); formError.value = ''; showForm.value = true; }
async function saveDeposit() {
    formError.value = '';
    if (!form.depositDate || Number(form.amount) <= 0) {
        formError.value = 'Enter a date and positive deposit amount.';
        return;
    }
    saving.value = true;
    try {
        const payload = { ...form, amount: Number(form.amount) };
        if (demoMode) {
            if (editingId.value)
                updateDemoEngineerDeposit(editingId.value, payload);
            else
                addDemoEngineerDeposit(payload);
        }
        else
            await api(editingId.value ? `/engineer-deposits/deposits/${editingId.value}` : '/engineer-deposits/deposits', { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
        showForm.value = false;
        await load();
    }
    catch (reason) {
        formError.value = reason instanceof Error ? reason.message : 'Could not save the deposit.';
    }
    finally {
        saving.value = false;
    }
}
async function removeDeposit(item) {
    if (!window.confirm(`Delete the ${money(item.credit)} deposit from ${date(item.transactionDate)}?`))
        return;
    try {
        if (demoMode)
            deleteDemoEngineerDeposit(item.id);
        else
            await api(`/engineer-deposits/deposits/${item.id}`, { method: 'DELETE' });
        await load();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not delete the deposit.';
    }
}
function exportLedger() {
    if (!ledger.value)
        return;
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [['Date', 'Type', 'Reference', 'Site', 'Details', 'Credit', 'Debit', 'Balance'], ...transactions.value.map((item) => [item.transactionDate, item.type, item.referenceNo, item.siteName, item.description, item.credit, item.debit, item.balance])];
    const blob = new Blob([rows.map((row) => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${ledger.value.employeeCode || ledger.value.employeeId}-${ledger.value.projectCode}-ledger.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "sites-page engineer-ledger-page" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/finance/engineer-deposits",
    ...{ class: "back-link" },
}));
const __VLS_2 = __VLS_1({
    to: "/finance/engineer-deposits",
    ...{ class: "back-link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.ArrowLeft;
/** @type {[typeof __VLS_components.ArrowLeft, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (16),
}));
const __VLS_6 = __VLS_5({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
var __VLS_3;
if (__VLS_ctx.loading && !__VLS_ctx.ledger) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel table-loading" },
    });
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "form-error site-load-error" },
    });
    (__VLS_ctx.error);
}
if (__VLS_ctx.ledger) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ledger-hero panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ledger-person" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.ledger.employeeName.split(' ').map((part) => part[0]).join('').slice(0, 2));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.ledger.employeeName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.ledger.employeeCode || `Employee #${__VLS_ctx.ledger.employeeId}`);
    (__VLS_ctx.ledger.projectCode);
    (__VLS_ctx.ledger.projectName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ledger-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.exportLedger) },
        ...{ class: "secondary-button" },
    });
    const __VLS_8 = {}.Download;
    /** @type {[typeof __VLS_components.Download, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        size: (16),
    }));
    const __VLS_10 = __VLS_9({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    if (__VLS_ctx.canManage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.openNew) },
            ...{ class: "primary-button" },
        });
        const __VLS_12 = {}.Plus;
        /** @type {[typeof __VLS_components.Plus, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            size: (17),
        }));
        const __VLS_14 = __VLS_13({
            size: (17),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ledger-balance-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_16 = {}.ArrowDownToLine;
    /** @type {[typeof __VLS_components.ArrowDownToLine, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        size: (18),
    }));
    const __VLS_18 = __VLS_17({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.money(__VLS_ctx.ledger.deposited));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
    (__VLS_ctx.counts.deposits);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_20 = {}.PackageSearch;
    /** @type {[typeof __VLS_components.PackageSearch, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        size: (18),
    }));
    const __VLS_22 = __VLS_21({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.money(__VLS_ctx.transactions.filter((item) => item.type === 'material').reduce((sum, item) => sum + item.debit, 0)));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
    (__VLS_ctx.counts.materials);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_24 = {}.CircleDollarSign;
    /** @type {[typeof __VLS_components.CircleDollarSign, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        size: (18),
    }));
    const __VLS_26 = __VLS_25({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.money(__VLS_ctx.transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.debit, 0)));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
    (__VLS_ctx.counts.expenses);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "panel net" },
        ...{ class: ({ negative: __VLS_ctx.ledger.balance < 0 }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_28 = {}.WalletCards;
    /** @type {[typeof __VLS_components.WalletCards, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        size: (18),
    }));
    const __VLS_30 = __VLS_29({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.money(__VLS_ctx.ledger.balance));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
    (__VLS_ctx.ledger.balance < 0 ? 'Overspent — review required' : 'Available with engineer');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ledger-explanation panel" },
    });
    const __VLS_32 = {}.BanknoteArrowDown;
    /** @type {[typeof __VLS_components.BanknoteArrowDown, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        size: (19),
    }));
    const __VLS_34 = __VLS_33({
        size: (19),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "site-toolbar panel ledger-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "table-search" },
    });
    const __VLS_36 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        size: (17),
    }));
    const __VLS_38 = __VLS_37({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "Search reference, site, details, notes, or date…",
    });
    (__VLS_ctx.search);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.typeFilter),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "all",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "deposit",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "material",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "expense",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "site-table-wrap panel ledger-table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "site-table engineer-transaction-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "sr-only" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.visible))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (`${item.type}-${item.id}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ledger-kind" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (item.type) },
        });
        (item.type === 'deposit' ? 'Deposit' : item.type === 'material' ? 'Material' : 'Expense');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.date(item.transactionDate));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        if (item.purchaseId) {
            const __VLS_40 = {}.RouterLink;
            /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
            // @ts-ignore
            const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
                to: (`/purchases/site-engineer/${item.purchaseId}/edit`),
                ...{ class: "ledger-reference" },
            }));
            const __VLS_42 = __VLS_41({
                to: (`/purchases/site-engineer/${item.purchaseId}/edit`),
                ...{ class: "ledger-reference" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_41));
            __VLS_43.slots.default;
            (item.referenceNo);
            var __VLS_43;
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
                ...{ class: "ledger-reference plain" },
            });
            (item.referenceNo || `DEP-${item.id}`);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ledger-site" },
        });
        (item.siteName || 'Project-wide');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ledger-description" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.description);
        if (item.notes && item.notes !== item.description) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (item.notes);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        if (item.credit) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
                ...{ class: "ledger-credit" },
            });
            (__VLS_ctx.money(item.credit));
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        if (item.debit) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
                ...{ class: "ledger-debit" },
            });
            (__VLS_ctx.money(item.debit));
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
            ...{ class: "deposit-balance" },
            ...{ class: ({ negative: item.balance < 0 }) },
        });
        (__VLS_ctx.money(item.balance));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        if (item.type === 'deposit') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "line-actions" },
            });
            if (__VLS_ctx.canManage) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.ledger))
                                return;
                            if (!(item.type === 'deposit'))
                                return;
                            if (!(__VLS_ctx.canManage))
                                return;
                            __VLS_ctx.openEdit(item);
                        } },
                    ...{ class: "line-edit" },
                    'aria-label': "Edit deposit",
                });
                const __VLS_44 = {}.Pencil;
                /** @type {[typeof __VLS_components.Pencil, ]} */ ;
                // @ts-ignore
                const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
                    size: (14),
                }));
                const __VLS_46 = __VLS_45({
                    size: (14),
                }, ...__VLS_functionalComponentArgsRest(__VLS_45));
            }
            if (__VLS_ctx.canDelete) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.ledger))
                                return;
                            if (!(item.type === 'deposit'))
                                return;
                            if (!(__VLS_ctx.canDelete))
                                return;
                            __VLS_ctx.removeDeposit(item);
                        } },
                    ...{ class: "line-delete" },
                    'aria-label': "Delete deposit",
                });
                const __VLS_48 = {}.Trash2;
                /** @type {[typeof __VLS_components.Trash2, ]} */ ;
                // @ts-ignore
                const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
                    size: (14),
                }));
                const __VLS_50 = __VLS_49({
                    size: (14),
                }, ...__VLS_functionalComponentArgsRest(__VLS_49));
            }
        }
    }
    if (!__VLS_ctx.visible.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "8",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "site-empty" },
        });
        const __VLS_52 = {}.WalletCards;
        /** @type {[typeof __VLS_components.WalletCards, ]} */ ;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
            size: (24),
        }));
        const __VLS_54 = __VLS_53({
            size: (24),
        }, ...__VLS_functionalComponentArgsRest(__VLS_53));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    if (__VLS_ctx.filtered.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
            ...{ class: "table-pagination" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        ((__VLS_ctx.page - 1) * __VLS_ctx.pageSize + 1);
        (Math.min(__VLS_ctx.page * __VLS_ctx.pageSize, __VLS_ctx.filtered.length));
        (__VLS_ctx.filtered.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.ledger))
                        return;
                    if (!(__VLS_ctx.filtered.length))
                        return;
                    __VLS_ctx.page--;
                } },
            disabled: (__VLS_ctx.page === 1),
        });
        const __VLS_56 = {}.ChevronLeft;
        /** @type {[typeof __VLS_components.ChevronLeft, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            size: (16),
        }));
        const __VLS_58 = __VLS_57({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.page);
        (__VLS_ctx.pageCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.ledger))
                        return;
                    if (!(__VLS_ctx.filtered.length))
                        return;
                    __VLS_ctx.page++;
                } },
            disabled: (__VLS_ctx.page === __VLS_ctx.pageCount),
        });
        const __VLS_60 = {}.ChevronRight;
        /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
            size: (16),
        }));
        const __VLS_62 = __VLS_61({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    }
}
if (__VLS_ctx.showForm) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showForm))
                    return;
                __VLS_ctx.showForm = false;
            } },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveDeposit) },
        ...{ class: "expense-line-modal deposit-entry-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_64 = {}.ArrowDownToLine;
    /** @type {[typeof __VLS_components.ArrowDownToLine, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        size: (18),
    }));
    const __VLS_66 = __VLS_65({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.editingId ? 'Modify deposit' : 'Add deposit');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.ledger?.employeeName);
    (__VLS_ctx.ledger?.projectCode);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showForm))
                    return;
                __VLS_ctx.showForm = false;
            } },
        type: "button",
        ...{ class: "modal-close" },
    });
    const __VLS_68 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        size: (18),
    }));
    const __VLS_70 = __VLS_69({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid two" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "date",
        required: true,
    });
    (__VLS_ctx.form.depositDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0.01",
        step: "0.01",
        required: true,
    });
    (__VLS_ctx.form.amount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.form.siteId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [site] of __VLS_getVForSourceType((__VLS_ctx.sites))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (site.id),
            value: (site.id),
        });
        (site.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        maxlength: "120",
        placeholder: "Cheque, voucher, or transfer no.",
    });
    (__VLS_ctx.form.referenceNo);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.form.notes),
        rows: "3",
        maxlength: "500",
        placeholder: "Optional transaction details",
    });
    if (__VLS_ctx.formError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "form-error" },
        });
        (__VLS_ctx.formError);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showForm))
                    return;
                __VLS_ctx.showForm = false;
            } },
        type: "button",
        ...{ class: "secondary-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "primary-button" },
        disabled: (__VLS_ctx.saving),
    });
    (__VLS_ctx.saving ? 'Saving…' : __VLS_ctx.editingId ? 'Update deposit' : 'Save deposit');
}
/** @type {__VLS_StyleScopedClasses['sites-page']} */ ;
/** @type {__VLS_StyleScopedClasses['engineer-ledger-page']} */ ;
/** @type {__VLS_StyleScopedClasses['back-link']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['site-load-error']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-person']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-balance-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['net']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-explanation']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['site-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['table-search']} */ ;
/** @type {__VLS_StyleScopedClasses['site-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['site-table']} */ ;
/** @type {__VLS_StyleScopedClasses['engineer-transaction-table']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-kind']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-reference']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-reference']} */ ;
/** @type {__VLS_StyleScopedClasses['plain']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-site']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-description']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-credit']} */ ;
/** @type {__VLS_StyleScopedClasses['ledger-debit']} */ ;
/** @type {__VLS_StyleScopedClasses['deposit-balance']} */ ;
/** @type {__VLS_StyleScopedClasses['line-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['line-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['line-delete']} */ ;
/** @type {__VLS_StyleScopedClasses['site-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['table-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-line-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['deposit-entry-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['two']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowDownToLine: ArrowDownToLine,
            ArrowLeft: ArrowLeft,
            BanknoteArrowDown: BanknoteArrowDown,
            ChevronLeft: ChevronLeft,
            ChevronRight: ChevronRight,
            CircleDollarSign: CircleDollarSign,
            Download: Download,
            PackageSearch: PackageSearch,
            Pencil: Pencil,
            Plus: Plus,
            Search: Search,
            Trash2: Trash2,
            WalletCards: WalletCards,
            X: X,
            ledger: ledger,
            transactions: transactions,
            sites: sites,
            loading: loading,
            saving: saving,
            error: error,
            formError: formError,
            showForm: showForm,
            editingId: editingId,
            search: search,
            typeFilter: typeFilter,
            page: page,
            pageSize: pageSize,
            form: form,
            canManage: canManage,
            canDelete: canDelete,
            filtered: filtered,
            pageCount: pageCount,
            visible: visible,
            counts: counts,
            money: money,
            date: date,
            openNew: openNew,
            openEdit: openEdit,
            saveDeposit: saveDeposit,
            removeDeposit: removeDeposit,
            exportLedger: exportLedger,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
