import { computed, onMounted, ref } from 'vue';
import { BriefcaseBusiness, MapPinned, Pencil, Phone, Plus, Search, UserRoundCog } from 'lucide-vue-next';
import { api } from '../services/api';
import { employeeAssignments } from '../data/assignments';
const assignments = ref(employeeAssignments.map((item) => ({ ...item, projects: [...item.projects], sites: [...item.sites] })));
const search = ref('');
const loading = ref(false);
const error = ref('');
onMounted(async () => {
    if (import.meta.env.VITE_DEMO_MODE !== 'false')
        return;
    loading.value = true;
    try {
        const result = await api('/assignments');
        assignments.value = result.assignments;
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load assignments.';
    }
    finally {
        loading.value = false;
    }
});
const filtered = computed(() => {
    const term = search.value.trim().toLowerCase();
    if (!term)
        return assignments.value;
    return assignments.value.filter((item) => [item.name, item.employeeCode, item.phone, ...item.projects.map((project) => `${project.code} ${project.name}`), ...item.sites.map((site) => site.name)].some((value) => value.toLowerCase().includes(term)));
});
const projectCount = computed(() => new Set(assignments.value.flatMap((item) => item.projects.map((project) => project.id))).size);
const siteCount = computed(() => assignments.value.reduce((sum, item) => sum + item.sites.length, 0));
function siteGroups(assignment) {
    return assignment.projects.map((project) => ({ project, sites: assignment.sites.filter((site) => site.projectId === project.id) }));
}
function initials(name) {
    return name.split(/\s+/).filter((part) => !/^eng\.?$/i.test(part)).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "assignments-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "welcome-row projects-tools" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.assignments.length);
(__VLS_ctx.projectCount);
(__VLS_ctx.siteCount);
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/projects/assignments/new",
    ...{ class: "primary-button" },
}));
const __VLS_2 = __VLS_1({
    to: "/projects/assignments/new",
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
    ...{ class: "assignment-toolbar panel" },
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
    placeholder: "Search employee, project or site…",
});
(__VLS_ctx.search);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.filtered.length);
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "form-error site-load-error" },
    });
    (__VLS_ctx.error);
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel table-loading" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "assignment-list" },
    });
    for (const [assignment] of __VLS_getVForSourceType((__VLS_ctx.filtered))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (assignment.id),
            ...{ class: "assignment-card panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "engineer-avatar" },
        });
        (__VLS_ctx.initials(assignment.name));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "engineer-summary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (assignment.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
        (assignment.employeeCode);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        const __VLS_12 = {}.Phone;
        /** @type {[typeof __VLS_components.Phone, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            size: (13),
        }));
        const __VLS_14 = __VLS_13({
            size: (13),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        (assignment.phone || 'No phone number');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "assignment-totals" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_16 = {}.BriefcaseBusiness;
        /** @type {[typeof __VLS_components.BriefcaseBusiness, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            size: (15),
        }));
        const __VLS_18 = __VLS_17({
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (assignment.projects.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_20 = {}.MapPinned;
        /** @type {[typeof __VLS_components.MapPinned, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            size: (15),
        }));
        const __VLS_22 = __VLS_21({
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (assignment.sites.length);
        const __VLS_24 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            to: (`/projects/assignments/${assignment.id}/edit`),
            ...{ class: "secondary-button" },
        }));
        const __VLS_26 = __VLS_25({
            to: (`/projects/assignments/${assignment.id}/edit`),
            ...{ class: "secondary-button" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_27.slots.default;
        const __VLS_28 = {}.Pencil;
        /** @type {[typeof __VLS_components.Pencil, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            size: (15),
        }));
        const __VLS_30 = __VLS_29({
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        var __VLS_27;
        if (assignment.projects.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "assignment-projects" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            for (const [project] of __VLS_getVForSourceType((assignment.projects))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    key: (project.id),
                    ...{ class: "assignment-project-chip" },
                });
                const __VLS_32 = {}.BriefcaseBusiness;
                /** @type {[typeof __VLS_components.BriefcaseBusiness, ]} */ ;
                // @ts-ignore
                const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
                    size: (13),
                }));
                const __VLS_34 = __VLS_33({
                    size: (13),
                }, ...__VLS_functionalComponentArgsRest(__VLS_33));
                (project.code);
            }
        }
        if (assignment.sites.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
                open: true,
                ...{ class: "assigned-sites-detail" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (assignment.sites.length);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "assignment-site-groups" },
            });
            for (const [group] of __VLS_getVForSourceType((__VLS_ctx.siteGroups(assignment)))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
                    key: (group.project.id),
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (group.project.code);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (group.sites.length);
                if (group.sites.length) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                    for (const [site] of __VLS_getVForSourceType((group.sites))) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                            key: (site.id),
                            ...{ class: "assigned-site" },
                        });
                        const __VLS_36 = {}.MapPinned;
                        /** @type {[typeof __VLS_components.MapPinned, ]} */ ;
                        // @ts-ignore
                        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
                            size: (12),
                        }));
                        const __VLS_38 = __VLS_37({
                            size: (12),
                        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
                        (site.name);
                    }
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                }
            }
        }
        if (!assignment.projects.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "unassigned-engineer" },
            });
            const __VLS_40 = {}.UserRoundCog;
            /** @type {[typeof __VLS_components.UserRoundCog, ]} */ ;
            // @ts-ignore
            const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
                size: (19),
            }));
            const __VLS_42 = __VLS_41({
                size: (19),
            }, ...__VLS_functionalComponentArgsRest(__VLS_41));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        }
    }
    if (!__VLS_ctx.filtered.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-projects panel" },
        });
        const __VLS_44 = {}.Search;
        /** @type {[typeof __VLS_components.Search, ]} */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
            size: (24),
        }));
        const __VLS_46 = __VLS_45({
            size: (24),
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
/** @type {__VLS_StyleScopedClasses['assignments-page']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-row']} */ ;
/** @type {__VLS_StyleScopedClasses['projects-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table-search']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['site-load-error']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-list']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['engineer-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['engineer-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-totals']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-projects']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-project-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['assigned-sites-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-site-groups']} */ ;
/** @type {__VLS_StyleScopedClasses['assigned-site']} */ ;
/** @type {__VLS_StyleScopedClasses['unassigned-engineer']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-projects']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            BriefcaseBusiness: BriefcaseBusiness,
            MapPinned: MapPinned,
            Pencil: Pencil,
            Phone: Phone,
            Plus: Plus,
            Search: Search,
            UserRoundCog: UserRoundCog,
            assignments: assignments,
            search: search,
            loading: loading,
            error: error,
            filtered: filtered,
            projectCount: projectCount,
            siteCount: siteCount,
            siteGroups: siteGroups,
            initials: initials,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
