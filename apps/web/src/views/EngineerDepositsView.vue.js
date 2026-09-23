import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowDownToLine, ChevronLeft, ChevronRight, CircleDollarSign, Landmark, Plus, Search, WalletCards, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { addDemoEngineerDeposit, buildDemoEngineerAccounts } from '../data/engineerDeposits';
import { employeeProjectOptions } from '../data/sitePurchases';
import { employeeOptions } from '../data/assignments';
import { projects } from '../data/projects';
import { projectSites } from '../data/projectSites';
const auth = useAuthStore();
const router = useRouter();
const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false';
const accounts = ref(buildDemoEngineerAccounts());
const projectOptions = ref(projects.map((item) => ({ id: item.id, code: item.code, name: item.name })));
const employeeOptionsByProject = ref(employeeProjectOptions.map((assignment) => {
    const employee = employeeOptions.find((item) => item.id === assignment.employeeId);
    return { id: assignment.employeeId, employeeCode: employee?.employeeCode ?? '', name: employee?.name ?? `Engineer #${assignment.employeeId}`, projectId: assignment.projectId };
}));
const siteOptions = ref(projectSites.map((item) => ({ id: item.id, projectId: item.projectId, name: item.name })));
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const formError = ref('');
const showForm = ref(false);
const search = ref('');
const balanceFilter = ref('all');
const page = ref(1);
const pageSize = 12;
const today = new Date().toISOString().slice(0, 10);
const form = reactive({ employeeId: 0, projectId: 0, siteId: null, depositDate: today, amount: 0, referenceNo: '', notes: '' });
const canManage = computed(() => auth.hasPermission('engineer_deposits.manage'));
const filteredEmployees = computed(() => employeeOptionsByProject.value.filter((item) => item.projectId === form.projectId));
const filteredSites = computed(() => siteOptions.value.filter((item) => item.projectId === form.projectId));
const filtered = computed(() => {
    const term = search.value.trim().toLowerCase();
    return accounts.value.filter((item) => {
        const matchesSearch = !term || [item.employeeName, item.employeeCode, item.projectName, item.projectCode].some((value) => String(value ?? '').toLowerCase().includes(term));
        const matchesBalance = balanceFilter.value === 'all' || (balanceFilter.value === 'available' && item.balance >= 0) || (balanceFilter.value === 'overspent' && item.balance < 0);
        return matchesSearch && matchesBalance;
    });
});
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const totals = computed(() => accounts.value.reduce((result, item) => ({ deposited: result.deposited + Number(item.deposited), purchased: result.purchased + Number(item.purchased), balance: result.balance + Number(item.balance), transactions: result.transactions + Number(item.depositCount) }), { deposited: 0, purchased: 0, balance: 0, transactions: 0 }));
watch([search, balanceFilter], () => { page.value = 1; });
watch(() => form.projectId, () => { if (!filteredEmployees.value.some((item) => item.id === form.employeeId))
    form.employeeId = 0; if (!filteredSites.value.some((item) => item.id === form.siteId))
    form.siteId = null; });
onMounted(async () => {
    if (demoMode)
        return;
    loading.value = true;
    try {
        const [summary, options] = await Promise.all([
            api('/engineer-deposits'),
            api('/engineer-deposits/options'),
        ]);
        accounts.value = summary.accounts;
        projectOptions.value = options.projects;
        employeeOptionsByProject.value = options.employees;
        siteOptions.value = options.sites;
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load engineer balances.';
    }
    finally {
        loading.value = false;
    }
});
function money(value) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(value)); }
function date(value) { return value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'No activity'; }
function openForm() { Object.assign(form, { employeeId: 0, projectId: 0, siteId: null, depositDate: today, amount: 0, referenceNo: '', notes: '' }); formError.value = ''; showForm.value = true; }
async function saveDeposit() {
    formError.value = '';
    if (!form.projectId || !form.employeeId || !form.depositDate || Number(form.amount) <= 0) {
        formError.value = 'Select the project and engineer, then enter a positive deposit amount.';
        return;
    }
    saving.value = true;
    try {
        if (demoMode)
            addDemoEngineerDeposit({ ...form, amount: Number(form.amount) });
        else
            await api('/engineer-deposits/deposits', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
        showForm.value = false;
        if (demoMode)
            accounts.value = buildDemoEngineerAccounts();
        await router.push(`/finance/engineer-deposits/${form.employeeId}/${form.projectId}`);
    }
    catch (reason) {
        formError.value = reason instanceof Error ? reason.message : 'Could not save the deposit.';
    }
    finally {
        saving.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "sites-page engineer-deposits-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "expense-page-intro panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_0 = {}.WalletCards;
/** @type {[typeof __VLS_components.WalletCards, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (22),
}));
const __VLS_2 = __VLS_1({
    size: (22),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.money(__VLS_ctx.totals.balance));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "deposit-stat-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_4 = {}.ArrowDownToLine;
/** @type {[typeof __VLS_components.ArrowDownToLine, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (18),
}));
const __VLS_6 = __VLS_5({
    size: (18),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.money(__VLS_ctx.totals.deposited));
__VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
(__VLS_ctx.totals.transactions.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "panel spent" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_8 = {}.CircleDollarSign;
/** @type {[typeof __VLS_components.CircleDollarSign, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (18),
}));
const __VLS_10 = __VLS_9({
    size: (18),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.money(__VLS_ctx.totals.purchased));
__VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "panel" },
    ...{ class: ({ warning: __VLS_ctx.totals.balance < 0 }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_12 = {}.Landmark;
/** @type {[typeof __VLS_components.Landmark, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    size: (18),
}));
const __VLS_14 = __VLS_13({
    size: (18),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.money(__VLS_ctx.totals.balance));
__VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
(__VLS_ctx.accounts.filter((item) => item.balance < 0).length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "welcome-row projects-tools" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.filtered.length);
if (__VLS_ctx.canManage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openForm) },
        ...{ class: "primary-button" },
    });
    const __VLS_16 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        size: (18),
    }));
    const __VLS_18 = __VLS_17({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "site-toolbar panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "table-search" },
});
const __VLS_20 = {}.Search;
/** @type {[typeof __VLS_components.Search, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    size: (17),
}));
const __VLS_22 = __VLS_21({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Search engineer, employee code, or project…",
});
(__VLS_ctx.search);
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.balanceFilter),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "all",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "available",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "overspent",
});
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "form-error site-load-error" },
    });
    (__VLS_ctx.error);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "site-table-wrap panel deposit-ledger-wrap" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-loading" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "site-table deposit-ledger-table" },
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
            key: (`${item.employeeId}-${item.projectId}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "deposit-engineer" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.employeeName.split(' ').map((part) => part[0]).join('').slice(0, 2));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.employeeName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (item.employeeCode || `Employee #${item.employeeId}`);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "site-project-cell" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.projectCode);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (item.projectName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "deposit-money credit" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.money(item.deposited));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (item.depositCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "deposit-money" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.money(item.materialTotal));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "deposit-money" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.money(item.expenseTotal));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
            ...{ class: "deposit-balance" },
            ...{ class: ({ negative: item.balance < 0 }) },
        });
        (__VLS_ctx.money(item.balance));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "deposit-date" },
        });
        (__VLS_ctx.date(item.lastActivityDate));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        const __VLS_24 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            to: (`/finance/engineer-deposits/${item.employeeId}/${item.projectId}`),
            ...{ class: "secondary-button small" },
        }));
        const __VLS_26 = __VLS_25({
            to: (`/finance/engineer-deposits/${item.employeeId}/${item.projectId}`),
            ...{ class: "secondary-button small" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_27.slots.default;
        var __VLS_27;
    }
    if (!__VLS_ctx.visible.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "8",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "site-empty" },
        });
        const __VLS_28 = {}.WalletCards;
        /** @type {[typeof __VLS_components.WalletCards, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            size: (24),
        }));
        const __VLS_30 = __VLS_29({
            size: (24),
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
if (!__VLS_ctx.loading && __VLS_ctx.filtered.length) {
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
                if (!(!__VLS_ctx.loading && __VLS_ctx.filtered.length))
                    return;
                __VLS_ctx.page--;
            } },
        disabled: (__VLS_ctx.page === 1),
    });
    const __VLS_32 = {}.ChevronLeft;
    /** @type {[typeof __VLS_components.ChevronLeft, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        size: (16),
    }));
    const __VLS_34 = __VLS_33({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.page);
    (__VLS_ctx.pageCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.loading && __VLS_ctx.filtered.length))
                    return;
                __VLS_ctx.page++;
            } },
        disabled: (__VLS_ctx.page === __VLS_ctx.pageCount),
    });
    const __VLS_36 = {}.ChevronRight;
    /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        size: (16),
    }));
    const __VLS_38 = __VLS_37({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
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
    const __VLS_40 = {}.ArrowDownToLine;
    /** @type {[typeof __VLS_components.ArrowDownToLine, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        size: (18),
    }));
    const __VLS_42 = __VLS_41({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showForm))
                    return;
                __VLS_ctx.showForm = false;
            } },
        type: "button",
        ...{ class: "modal-close" },
    });
    const __VLS_44 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        size: (18),
    }));
    const __VLS_46 = __VLS_45({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid two" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.form.projectId),
        required: true,
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
        disabled: true,
    });
    for (const [project] of __VLS_getVForSourceType((__VLS_ctx.projectOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (project.id),
            value: (project.id),
        });
        (project.code);
        (project.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.form.employeeId),
        required: true,
        disabled: (!__VLS_ctx.form.projectId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
        disabled: true,
    });
    for (const [employee] of __VLS_getVForSourceType((__VLS_ctx.filteredEmployees))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (`${employee.id}-${employee.projectId}`),
            value: (employee.id),
        });
        (employee.employeeCode || `#${employee.id}`);
        (employee.name);
    }
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
        placeholder: "0.00",
    });
    (__VLS_ctx.form.amount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.form.siteId),
        disabled: (!__VLS_ctx.form.projectId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [site] of __VLS_getVForSourceType((__VLS_ctx.filteredSites))) {
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
        maxlength: "500",
        rows: "3",
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
    (__VLS_ctx.saving ? 'Saving…' : 'Save deposit');
}
/** @type {__VLS_StyleScopedClasses['sites-page']} */ ;
/** @type {__VLS_StyleScopedClasses['engineer-deposits-page']} */ ;
/** @type {__VLS_StyleScopedClasses['expense-page-intro']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['deposit-stat-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['spent']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-row']} */ ;
/** @type {__VLS_StyleScopedClasses['projects-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['site-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table-search']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['site-load-error']} */ ;
/** @type {__VLS_StyleScopedClasses['site-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['deposit-ledger-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['table-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['site-table']} */ ;
/** @type {__VLS_StyleScopedClasses['deposit-ledger-table']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['deposit-engineer']} */ ;
/** @type {__VLS_StyleScopedClasses['site-project-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['deposit-money']} */ ;
/** @type {__VLS_StyleScopedClasses['credit']} */ ;
/** @type {__VLS_StyleScopedClasses['deposit-money']} */ ;
/** @type {__VLS_StyleScopedClasses['deposit-money']} */ ;
/** @type {__VLS_StyleScopedClasses['deposit-balance']} */ ;
/** @type {__VLS_StyleScopedClasses['deposit-date']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
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
            ChevronLeft: ChevronLeft,
            ChevronRight: ChevronRight,
            CircleDollarSign: CircleDollarSign,
            Landmark: Landmark,
            Plus: Plus,
            Search: Search,
            WalletCards: WalletCards,
            X: X,
            accounts: accounts,
            projectOptions: projectOptions,
            loading: loading,
            saving: saving,
            error: error,
            formError: formError,
            showForm: showForm,
            search: search,
            balanceFilter: balanceFilter,
            page: page,
            pageSize: pageSize,
            form: form,
            canManage: canManage,
            filteredEmployees: filteredEmployees,
            filteredSites: filteredSites,
            filtered: filtered,
            pageCount: pageCount,
            visible: visible,
            totals: totals,
            money: money,
            date: date,
            openForm: openForm,
            saveDeposit: saveDeposit,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
