import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, BriefcaseBusiness, Check, CheckSquare2, MapPinned, Save, Search, Square, UserRoundCog } from 'lucide-vue-next';
import { api } from '../services/api';
import { employeeAssignments, employeeOptions } from '../data/assignments';
import { projects as demoProjects } from '../data/projects';
import { projectSites as demoSites } from '../data/projectSites';
const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'assignment-edit');
const routeEmployeeId = computed(() => Number(route.params.employeeId));
const demoExisting = computed(() => employeeAssignments.find((item) => item.id === routeEmployeeId.value));
const employees = ref([...employeeOptions]);
const projectOptions = ref(demoProjects.map(({ id, code, name, tenderId, location }) => ({ id, code, name, tenderId, location })));
const siteOptions = ref(demoSites.map(({ id, projectId, projectCode, projectName, name, address }) => ({ id, projectId, projectCode, projectName, name, address })));
const employeeId = ref(editing.value ? routeEmployeeId.value : 0);
const projectIds = ref(demoExisting.value?.projects.map((item) => item.id) ?? []);
const siteIds = ref(demoExisting.value?.sites.map((item) => item.id) ?? []);
const projectSearch = ref('');
const siteSearch = ref('');
const loading = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref('');
onMounted(async () => {
    if (import.meta.env.VITE_DEMO_MODE !== 'false')
        return;
    loading.value = true;
    try {
        const requests = [
            api('/assignments/options'),
            editing.value ? api(`/assignments/${routeEmployeeId.value}`) : null,
        ];
        const [options, current] = await Promise.all(requests);
        employees.value = options.employees;
        projectOptions.value = options.projects;
        siteOptions.value = options.sites;
        if (current) {
            employeeId.value = current.assignment.id;
            projectIds.value = current.assignment.projects.map((item) => item.id);
            siteIds.value = current.assignment.sites.map((item) => item.id);
        }
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load assignment options.';
    }
    finally {
        loading.value = false;
    }
});
const filteredProjects = computed(() => {
    const term = projectSearch.value.trim().toLowerCase();
    return projectOptions.value.filter((project) => !term || [project.code, project.name, project.tenderId, project.location].some((value) => value.toLowerCase().includes(term)));
});
const selectedProjects = computed(() => projectOptions.value.filter((project) => projectIds.value.includes(project.id)));
const selectedEmployee = computed(() => employees.value.find((employee) => employee.id === employeeId.value));
function projectSites(projectId) {
    const term = siteSearch.value.trim().toLowerCase();
    return siteOptions.value.filter((site) => site.projectId === projectId && (!term || [site.name, site.address].some((value) => value.toLowerCase().includes(term))));
}
function toggleProject(projectId) {
    if (projectIds.value.includes(projectId)) {
        projectIds.value = projectIds.value.filter((id) => id !== projectId);
        const removedSiteIds = new Set(siteOptions.value.filter((site) => site.projectId === projectId).map((site) => site.id));
        siteIds.value = siteIds.value.filter((id) => !removedSiteIds.has(id));
    }
    else
        projectIds.value.push(projectId);
}
function toggleSite(siteId) {
    siteIds.value = siteIds.value.includes(siteId) ? siteIds.value.filter((id) => id !== siteId) : [...siteIds.value, siteId];
}
function allSitesSelected(projectId) {
    const ids = siteOptions.value.filter((site) => site.projectId === projectId).map((site) => site.id);
    return ids.length > 0 && ids.every((id) => siteIds.value.includes(id));
}
function toggleAllSites(projectId) {
    const ids = siteOptions.value.filter((site) => site.projectId === projectId).map((site) => site.id);
    if (allSitesSelected(projectId))
        siteIds.value = siteIds.value.filter((id) => !ids.includes(id));
    else
        siteIds.value = [...new Set([...siteIds.value, ...ids])];
}
async function save() {
    error.value = '';
    if (!employeeId.value) {
        error.value = 'Select an employee.';
        return;
    }
    if (!projectIds.value.length) {
        error.value = 'Select at least one project.';
        return;
    }
    saving.value = true;
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            await api(`/assignments/${employeeId.value}`, { method: 'PUT', body: JSON.stringify({ projectIds: projectIds.value, siteIds: siteIds.value }) });
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const target = employeeAssignments.find((item) => item.id === employeeId.value);
            const employee = selectedEmployee.value;
            const next = {
                ...(target ?? { ...employee, email: '', address: '', status: 'active' }),
                projects: projectOptions.value.filter((project) => projectIds.value.includes(project.id)).map(({ id, code, name }) => ({ id, code, name })),
                sites: siteOptions.value.filter((site) => siteIds.value.includes(site.id)),
            };
            if (target)
                Object.assign(target, next);
            else
                employeeAssignments.push(next);
        }
        saved.value = true;
        setTimeout(() => router.push('/projects/assignments'), 550);
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save assignments.';
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
    ...{ class: "assignment-form-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-page-head" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/projects/assignments",
    ...{ class: "back-link" },
}));
const __VLS_2 = __VLS_1({
    to: "/projects/assignments",
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "form-heading-icon" },
});
const __VLS_8 = {}.UserRoundCog;
/** @type {[typeof __VLS_components.UserRoundCog, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (21),
}));
const __VLS_10 = __VLS_9({
    size: (21),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.editing ? 'Modify employee assignments' : 'Assign projects and sites');
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel table-loading" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.save) },
        ...{ class: "assignment-form" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "assignment-step panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.employeeId),
        disabled: (__VLS_ctx.editing),
        required: true,
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
        disabled: true,
    });
    for (const [employee] of __VLS_getVForSourceType((__VLS_ctx.employees))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (employee.id),
            value: (employee.id),
        });
        (employee.employeeCode);
        (employee.name);
        (employee.phone);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "assignment-step panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
    (__VLS_ctx.projectIds.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "assignment-search" },
    });
    const __VLS_12 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: (16),
    }));
    const __VLS_14 = __VLS_13({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "Search package, project, tender or location…",
    });
    (__VLS_ctx.projectSearch);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "project-choice-grid" },
    });
    for (const [project] of __VLS_getVForSourceType((__VLS_ctx.filteredProjects))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.toggleProject(project.id);
                } },
            key: (project.id),
            type: "button",
            ...{ class: "project-choice" },
            ...{ class: ({ selected: __VLS_ctx.projectIds.includes(project.id) }) },
        });
        if (__VLS_ctx.projectIds.includes(project.id)) {
            const __VLS_16 = {}.CheckSquare2;
            /** @type {[typeof __VLS_components.CheckSquare2, ]} */ ;
            // @ts-ignore
            const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
                size: (18),
            }));
            const __VLS_18 = __VLS_17({
                size: (18),
            }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        }
        else {
            const __VLS_20 = {}.Square;
            /** @type {[typeof __VLS_components.Square, ]} */ ;
            // @ts-ignore
            const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
                size: (18),
            }));
            const __VLS_22 = __VLS_21({
                size: (18),
            }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (project.code);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (project.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
        (project.location);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "assignment-step panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
    (__VLS_ctx.siteIds.length);
    if (__VLS_ctx.selectedProjects.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "site-choice-area" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "assignment-search" },
        });
        const __VLS_24 = {}.Search;
        /** @type {[typeof __VLS_components.Search, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            size: (16),
        }));
        const __VLS_26 = __VLS_25({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "Search selected project sites…",
        });
        (__VLS_ctx.siteSearch);
        for (const [project] of __VLS_getVForSourceType((__VLS_ctx.selectedProjects))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
                key: (project.id),
                ...{ class: "site-choice-group" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            const __VLS_28 = {}.BriefcaseBusiness;
            /** @type {[typeof __VLS_components.BriefcaseBusiness, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
                size: (15),
            }));
            const __VLS_30 = __VLS_29({
                size: (15),
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (project.code);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (project.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.selectedProjects.length))
                            return;
                        __VLS_ctx.toggleAllSites(project.id);
                    } },
                type: "button",
            });
            (__VLS_ctx.allSitesSelected(project.id) ? 'Clear all' : 'Select all');
            if (__VLS_ctx.projectSites(project.id).length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "site-choice-grid" },
                });
                for (const [site] of __VLS_getVForSourceType((__VLS_ctx.projectSites(project.id)))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(__VLS_ctx.loading))
                                    return;
                                if (!(__VLS_ctx.selectedProjects.length))
                                    return;
                                if (!(__VLS_ctx.projectSites(project.id).length))
                                    return;
                                __VLS_ctx.toggleSite(site.id);
                            } },
                        key: (site.id),
                        type: "button",
                        ...{ class: ({ selected: __VLS_ctx.siteIds.includes(site.id) }) },
                    });
                    if (__VLS_ctx.siteIds.includes(site.id)) {
                        const __VLS_32 = {}.Check;
                        /** @type {[typeof __VLS_components.Check, ]} */ ;
                        // @ts-ignore
                        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
                            size: (14),
                        }));
                        const __VLS_34 = __VLS_33({
                            size: (14),
                        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
                    }
                    else {
                        const __VLS_36 = {}.MapPinned;
                        /** @type {[typeof __VLS_components.MapPinned, ]} */ ;
                        // @ts-ignore
                        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
                            size: (14),
                        }));
                        const __VLS_38 = __VLS_37({
                            size: (14),
                        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
                    }
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                    (site.name);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
                    (site.address);
                }
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "choose-project-prompt" },
        });
        const __VLS_40 = {}.BriefcaseBusiness;
        /** @type {[typeof __VLS_components.BriefcaseBusiness, ]} */ ;
        // @ts-ignore
        const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
            size: (22),
        }));
        const __VLS_42 = __VLS_41({
            size: (22),
        }, ...__VLS_functionalComponentArgsRest(__VLS_41));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    if (__VLS_ctx.error) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "form-error form-message" },
        });
        (__VLS_ctx.error);
    }
    if (__VLS_ctx.saved) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "save-success" },
        });
        const __VLS_44 = {}.Check;
        /** @type {[typeof __VLS_components.Check, ]} */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
            size: (16),
        }));
        const __VLS_46 = __VLS_45({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
        ...{ class: "assignment-form-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.selectedEmployee?.name || 'No employee selected');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.projectIds.length);
    (__VLS_ctx.siteIds.length);
    const __VLS_48 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        to: "/projects/assignments",
        ...{ class: "secondary-button" },
    }));
    const __VLS_50 = __VLS_49({
        to: "/projects/assignments",
        ...{ class: "secondary-button" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    var __VLS_51;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "primary-button" },
        disabled: (__VLS_ctx.saving),
    });
    const __VLS_52 = {}.Save;
    /** @type {[typeof __VLS_components.Save, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        size: (17),
    }));
    const __VLS_54 = __VLS_53({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    (__VLS_ctx.saving ? 'Saving…' : 'Save assignments');
}
/** @type {__VLS_StyleScopedClasses['assignment-form-page']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-head']} */ ;
/** @type {__VLS_StyleScopedClasses['back-link']} */ ;
/** @type {__VLS_StyleScopedClasses['form-heading-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-form']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-step']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-step']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-search']} */ ;
/** @type {__VLS_StyleScopedClasses['project-choice-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['project-choice']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-step']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['site-choice-area']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-search']} */ ;
/** @type {__VLS_StyleScopedClasses['site-choice-group']} */ ;
/** @type {__VLS_StyleScopedClasses['site-choice-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['choose-project-prompt']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['form-message']} */ ;
/** @type {__VLS_StyleScopedClasses['save-success']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            BriefcaseBusiness: BriefcaseBusiness,
            Check: Check,
            CheckSquare2: CheckSquare2,
            MapPinned: MapPinned,
            Save: Save,
            Search: Search,
            Square: Square,
            UserRoundCog: UserRoundCog,
            editing: editing,
            employees: employees,
            employeeId: employeeId,
            projectIds: projectIds,
            siteIds: siteIds,
            projectSearch: projectSearch,
            siteSearch: siteSearch,
            loading: loading,
            saving: saving,
            saved: saved,
            error: error,
            filteredProjects: filteredProjects,
            selectedProjects: selectedProjects,
            selectedEmployee: selectedEmployee,
            projectSites: projectSites,
            toggleProject: toggleProject,
            toggleSite: toggleSite,
            allSitesSelected: allSitesSelected,
            toggleAllSites: toggleAllSites,
            save: save,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
