import { computed, onMounted, ref, watch } from 'vue';
import { BriefcaseBusiness, ChevronLeft, ChevronRight, Mail, MapPinned, Pencil, Phone, Plus, Search, UserRoundCog } from 'lucide-vue-next';
import { api } from '../services/api';
import { employeeRecords } from '../data/employees';
const employees = ref(employeeRecords.map((employee) => ({ ...employee })));
const search = ref('');
const statusFilter = ref('all');
const loading = ref(false);
const error = ref('');
const page = ref(1);
const pageSize = 15;
onMounted(async () => {
    if (import.meta.env.VITE_DEMO_MODE !== 'false')
        return;
    loading.value = true;
    try {
        const result = await api('/employees');
        employees.value = result.employees;
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load employees.';
    }
    finally {
        loading.value = false;
    }
});
const filteredEmployees = computed(() => {
    const term = search.value.trim().toLowerCase();
    return employees.value.filter((employee) => {
        const matchesSearch = !term || [employee.name, employee.employeeCode, employee.phone, employee.email, employee.address, employee.department]
            .some((value) => String(value ?? '').toLowerCase().includes(term));
        const matchesStatus = statusFilter.value === 'all' || employee.status === statusFilter.value;
        return matchesSearch && matchesStatus;
    });
});
const activeCount = computed(() => employees.value.filter((employee) => employee.status === 'active').length);
const pageCount = computed(() => Math.max(1, Math.ceil(filteredEmployees.value.length / pageSize)));
const visibleEmployees = computed(() => filteredEmployees.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const rangeStart = computed(() => filteredEmployees.value.length ? (page.value - 1) * pageSize + 1 : 0);
const rangeEnd = computed(() => Math.min(page.value * pageSize, filteredEmployees.value.length));
watch([search, statusFilter], () => { page.value = 1; });
function initials(name) {
    return name.split(/\s+/).filter((part) => !/^eng\.?$/i.test(part)).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}
function salary(value) {
    if (value === null || value === undefined)
        return 'Not set';
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(value));
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "sites-page employees-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "welcome-row projects-tools" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.employees.length);
(__VLS_ctx.activeCount);
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/workforce/employees/new",
    ...{ class: "primary-button" },
}));
const __VLS_2 = __VLS_1({
    to: "/workforce/employees/new",
    ...{ class: "primary-button" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.Plus;
/** @type {[typeof __VLS_components.Plus, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (18),
}));
const __VLS_6 = __VLS_5({
    size: (18),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "site-toolbar panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "table-search" },
});
const __VLS_8 = {}.Search;
/** @type {[typeof __VLS_components.Search, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (17),
}));
const __VLS_10 = __VLS_9({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Search employee, code, phone or address…",
});
(__VLS_ctx.search);
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.statusFilter),
    'aria-label': "Filter by status",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "all",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "active",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "inactive",
});
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "form-error site-load-error" },
    });
    (__VLS_ctx.error);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "site-table-wrap panel employee-table-wrap" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-loading" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "site-table employee-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
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
    for (const [employee] of __VLS_getVForSourceType((__VLS_ctx.visibleEmployees))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (employee.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "employee-name-cell" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.initials(employee.name));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (employee.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (employee.employeeCode || 'No employee code');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "employee-contact" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_12 = {}.Phone;
        /** @type {[typeof __VLS_components.Phone, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            size: (13),
        }));
        const __VLS_14 = __VLS_13({
            size: (13),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        (employee.phone || 'No phone');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_16 = {}.Mail;
        /** @type {[typeof __VLS_components.Mail, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            size: (13),
        }));
        const __VLS_18 = __VLS_17({
            size: (13),
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        (employee.email || 'No email');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "employee-employment" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (employee.department || 'Site Engineer');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.salary(employee.salary));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        const __VLS_20 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            to: (`/projects/assignments/${employee.id}/edit`),
            ...{ class: "employee-assignment-link" },
        }));
        const __VLS_22 = __VLS_21({
            to: (`/projects/assignments/${employee.id}/edit`),
            ...{ class: "employee-assignment-link" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_23.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_24 = {}.BriefcaseBusiness;
        /** @type {[typeof __VLS_components.BriefcaseBusiness, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            size: (14),
        }));
        const __VLS_26 = __VLS_25({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (employee.projectCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_28 = {}.MapPinned;
        /** @type {[typeof __VLS_components.MapPinned, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            size: (14),
        }));
        const __VLS_30 = __VLS_29({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (employee.siteCount);
        var __VLS_23;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "status-chip" },
            ...{ class: (employee.status) },
        });
        (employee.status);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        const __VLS_32 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            to: (`/workforce/employees/${employee.id}/edit`),
            ...{ class: "card-edit" },
            title: "Modify employee",
        }));
        const __VLS_34 = __VLS_33({
            to: (`/workforce/employees/${employee.id}/edit`),
            ...{ class: "card-edit" },
            title: "Modify employee",
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        __VLS_35.slots.default;
        const __VLS_36 = {}.Pencil;
        /** @type {[typeof __VLS_components.Pencil, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            size: (15),
        }));
        const __VLS_38 = __VLS_37({
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        var __VLS_35;
    }
    if (__VLS_ctx.visibleEmployees.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "6",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "site-empty" },
        });
        const __VLS_40 = {}.UserRoundCog;
        /** @type {[typeof __VLS_components.UserRoundCog, ]} */ ;
        // @ts-ignore
        const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
            size: (24),
        }));
        const __VLS_42 = __VLS_41({
            size: (24),
        }, ...__VLS_functionalComponentArgsRest(__VLS_41));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
if (!__VLS_ctx.loading && __VLS_ctx.filteredEmployees.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
        ...{ class: "table-pagination" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.rangeStart);
    (__VLS_ctx.rangeEnd);
    (__VLS_ctx.filteredEmployees.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.loading && __VLS_ctx.filteredEmployees.length))
                    return;
                __VLS_ctx.page--;
            } },
        disabled: (__VLS_ctx.page === 1),
        'aria-label': "Previous page",
    });
    const __VLS_44 = {}.ChevronLeft;
    /** @type {[typeof __VLS_components.ChevronLeft, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        size: (16),
    }));
    const __VLS_46 = __VLS_45({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.page);
    (__VLS_ctx.pageCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.loading && __VLS_ctx.filteredEmployees.length))
                    return;
                __VLS_ctx.page++;
            } },
        disabled: (__VLS_ctx.page === __VLS_ctx.pageCount),
        'aria-label': "Next page",
    });
    const __VLS_48 = {}.ChevronRight;
    /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        size: (16),
    }));
    const __VLS_50 = __VLS_49({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
}
/** @type {__VLS_StyleScopedClasses['sites-page']} */ ;
/** @type {__VLS_StyleScopedClasses['employees-page']} */ ;
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
/** @type {__VLS_StyleScopedClasses['employee-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['table-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['site-table']} */ ;
/** @type {__VLS_StyleScopedClasses['employee-table']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['employee-name-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['employee-contact']} */ ;
/** @type {__VLS_StyleScopedClasses['employee-employment']} */ ;
/** @type {__VLS_StyleScopedClasses['employee-assignment-link']} */ ;
/** @type {__VLS_StyleScopedClasses['status-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['card-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['site-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['table-pagination']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            BriefcaseBusiness: BriefcaseBusiness,
            ChevronLeft: ChevronLeft,
            ChevronRight: ChevronRight,
            Mail: Mail,
            MapPinned: MapPinned,
            Pencil: Pencil,
            Phone: Phone,
            Plus: Plus,
            Search: Search,
            UserRoundCog: UserRoundCog,
            employees: employees,
            search: search,
            statusFilter: statusFilter,
            loading: loading,
            error: error,
            page: page,
            filteredEmployees: filteredEmployees,
            activeCount: activeCount,
            pageCount: pageCount,
            visibleEmployees: visibleEmployees,
            rangeStart: rangeStart,
            rangeEnd: rangeEnd,
            initials: initials,
            salary: salary,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
