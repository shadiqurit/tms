import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, Check, CircleDollarSign, FileText, Hash, MapPin, Save, ShieldAlert, Trash2, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { projects } from '../data/projects';
const route = useRoute();
const router = useRouter();
const projectId = computed(() => Number(route.params.id));
const editing = computed(() => route.name === 'project-edit');
const existing = computed(() => projects.find((project) => project.id === projectId.value));
const saving = ref(false);
const saved = ref(false);
const error = ref('');
const deleteOpen = ref(false);
const deleteLoading = ref(false);
const deleteError = ref('');
const confirmDelete = ref('');
const deleteCheck = ref(null);
const form = reactive({
    name: existing.value?.name ?? '',
    code: existing.value?.code ?? '',
    tenderId: existing.value?.tenderId ?? '',
    address: existing.value?.address ?? '',
    contractValue: existing.value?.value ? String(existing.value.value) : '',
    startDate: existing.value?.startDate ?? '',
    endDate: existing.value?.endDate ?? '',
    status: existing.value?.status ?? 'active',
});
async function save() {
    error.value = '';
    saved.value = false;
    if (!form.name.trim()) {
        error.value = 'Project name is required.';
        return;
    }
    saving.value = true;
    try {
        const payload = { ...form, contractValue: form.contractValue ? Number(form.contractValue) : null };
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            await api(editing.value ? `/projects/${projectId.value}` : '/projects', {
                method: editing.value ? 'PUT' : 'POST',
                body: JSON.stringify(payload),
            });
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 600));
        }
        saved.value = true;
        setTimeout(() => router.push('/projects'), 650);
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save the project.';
    }
    finally {
        saving.value = false;
    }
}
async function openDelete() {
    deleteError.value = '';
    confirmDelete.value = '';
    deleteCheck.value = null;
    deleteLoading.value = true;
    deleteOpen.value = true;
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            deleteCheck.value = await api(`/projects/${projectId.value}/delete-check`);
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 350));
            deleteCheck.value = { canDelete: (existing.value?.sites ?? 0) === 0, references: { sites: existing.value?.sites ?? 0, userAssignments: 0 } };
        }
    }
    catch (reason) {
        deleteError.value = reason instanceof Error ? reason.message : 'Could not check project references.';
    }
    finally {
        deleteLoading.value = false;
    }
}
async function removeProject() {
    if (!deleteCheck.value?.canDelete || confirmDelete.value !== 'DELETE')
        return;
    deleteLoading.value = true;
    deleteError.value = '';
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            await api(`/projects/${projectId.value}`, { method: 'DELETE' });
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        await router.push('/projects');
    }
    catch (reason) {
        deleteError.value = reason instanceof Error ? reason.message : 'The project could not be deleted.';
        deleteCheck.value = { canDelete: false, references: deleteCheck.value.references };
    }
    finally {
        deleteLoading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "project-form-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-page-head" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/projects",
    ...{ class: "back-link" },
}));
const __VLS_2 = __VLS_1({
    to: "/projects",
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
const __VLS_8 = {}.Building2;
/** @type {[typeof __VLS_components.Building2, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (21),
}));
const __VLS_10 = __VLS_9({
    size: (21),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.editing ? 'Modify project' : 'Create a new project');
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.editing ? 'Update the project information below.' : 'Enter the core project details. Sites can be added after saving.');
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.save) },
    ...{ class: "project-form panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_12 = {}.FileText;
/** @type {[typeof __VLS_components.FileText, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    size: (17),
}));
const __VLS_14 = __VLS_13({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Enter the full project name",
    required: true,
});
(__VLS_ctx.form.name);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_16 = {}.Hash;
/** @type {[typeof __VLS_components.Hash, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    size: (17),
}));
const __VLS_18 = __VLS_17({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "e.g. PEDP4/WB-1803",
});
(__VLS_ctx.form.code);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_20 = {}.Hash;
/** @type {[typeof __VLS_components.Hash, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    size: (17),
}));
const __VLS_22 = __VLS_21({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "e.g. 794739",
});
(__VLS_ctx.form.tenderId);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_24 = {}.MapPin;
/** @type {[typeof __VLS_components.MapPin, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    size: (17),
}));
const __VLS_26 = __VLS_25({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "District, upazila, or project area",
});
(__VLS_ctx.form.address);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-divider" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-grid three" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_28 = {}.CircleDollarSign;
/** @type {[typeof __VLS_components.CircleDollarSign, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    size: (17),
}));
const __VLS_30 = __VLS_29({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "0",
    step: "0.01",
    placeholder: "0.00",
});
(__VLS_ctx.form.contractValue);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_32 = {}.CalendarDays;
/** @type {[typeof __VLS_components.CalendarDays, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    size: (17),
}));
const __VLS_34 = __VLS_33({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "date",
});
(__VLS_ctx.form.startDate);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_36 = {}.CalendarDays;
/** @type {[typeof __VLS_components.CalendarDays, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    size: (17),
}));
const __VLS_38 = __VLS_37({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "date",
});
(__VLS_ctx.form.endDate);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.form.status),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "planned",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "active",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "on_hold",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "completed",
});
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
    const __VLS_40 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        size: (16),
    }));
    const __VLS_42 = __VLS_41({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "form-actions" },
});
if (__VLS_ctx.editing) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openDelete) },
        type: "button",
        ...{ class: "delete-project-button" },
    });
    const __VLS_44 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        size: (16),
    }));
    const __VLS_46 = __VLS_45({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
}
const __VLS_48 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    to: "/projects",
    ...{ class: "secondary-button" },
}));
const __VLS_50 = __VLS_49({
    to: "/projects",
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
(__VLS_ctx.saving ? 'Saving…' : __VLS_ctx.editing ? 'Save changes' : 'Create project');
if (__VLS_ctx.deleteOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.deleteOpen))
                    return;
                __VLS_ctx.deleteOpen = false;
            } },
        ...{ class: "modal-backdrop" },
        role: "presentation",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "delete-modal" },
        role: "dialog",
        'aria-modal': "true",
        'aria-labelledby': "delete-title",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.deleteOpen))
                    return;
                __VLS_ctx.deleteOpen = false;
            } },
        ...{ class: "modal-close" },
        'aria-label': "Close",
    });
    const __VLS_56 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        size: (18),
    }));
    const __VLS_58 = __VLS_57({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "delete-modal-icon" },
    });
    const __VLS_60 = {}.ShieldAlert;
    /** @type {[typeof __VLS_components.ShieldAlert, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        size: (24),
    }));
    const __VLS_62 = __VLS_61({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        id: "delete-title",
    });
    if (__VLS_ctx.deleteLoading && !__VLS_ctx.deleteCheck) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else if (__VLS_ctx.deleteCheck && !__VLS_ctx.deleteCheck.canDelete) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "delete-blocked" },
        });
        const __VLS_64 = {}.AlertTriangle;
        /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
            size: (18),
        }));
        const __VLS_66 = __VLS_65({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_65));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "reference-list" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.deleteCheck.references.sites);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.deleteCheck.references.userAssignments);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.deleteOpen))
                        return;
                    if (!!(__VLS_ctx.deleteLoading && !__VLS_ctx.deleteCheck))
                        return;
                    if (!(__VLS_ctx.deleteCheck && !__VLS_ctx.deleteCheck.canDelete))
                        return;
                    __VLS_ctx.deleteOpen = false;
                } },
            ...{ class: "secondary-button modal-done" },
        });
    }
    else if (__VLS_ctx.deleteCheck?.canDelete) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "delete-confirm-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            autocomplete: "off",
            placeholder: "DELETE",
        });
        (__VLS_ctx.confirmDelete);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.deleteOpen))
                        return;
                    if (!!(__VLS_ctx.deleteLoading && !__VLS_ctx.deleteCheck))
                        return;
                    if (!!(__VLS_ctx.deleteCheck && !__VLS_ctx.deleteCheck.canDelete))
                        return;
                    if (!(__VLS_ctx.deleteCheck?.canDelete))
                        return;
                    __VLS_ctx.deleteOpen = false;
                } },
            ...{ class: "secondary-button" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.removeProject) },
            ...{ class: "danger-button" },
            disabled: (__VLS_ctx.confirmDelete !== 'DELETE' || __VLS_ctx.deleteLoading),
        });
        const __VLS_68 = {}.Trash2;
        /** @type {[typeof __VLS_components.Trash2, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            size: (16),
        }));
        const __VLS_70 = __VLS_69({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        (__VLS_ctx.deleteLoading ? 'Deleting…' : 'Delete permanently');
    }
    if (__VLS_ctx.deleteError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "form-error modal-error" },
        });
        (__VLS_ctx.deleteError);
    }
}
/** @type {__VLS_StyleScopedClasses['project-form-page']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-head']} */ ;
/** @type {__VLS_StyleScopedClasses['back-link']} */ ;
/** @type {__VLS_StyleScopedClasses['form-heading-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['project-form']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['three']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['form-message']} */ ;
/** @type {__VLS_StyleScopedClasses['save-success']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-project-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-modal-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-blocked']} */ ;
/** @type {__VLS_StyleScopedClasses['reference-list']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-done']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-confirm-field']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['danger-button']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-error']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AlertTriangle: AlertTriangle,
            ArrowLeft: ArrowLeft,
            Building2: Building2,
            CalendarDays: CalendarDays,
            Check: Check,
            CircleDollarSign: CircleDollarSign,
            FileText: FileText,
            Hash: Hash,
            MapPin: MapPin,
            Save: Save,
            ShieldAlert: ShieldAlert,
            Trash2: Trash2,
            X: X,
            editing: editing,
            saving: saving,
            saved: saved,
            error: error,
            deleteOpen: deleteOpen,
            deleteLoading: deleteLoading,
            deleteError: deleteError,
            confirmDelete: confirmDelete,
            deleteCheck: deleteCheck,
            form: form,
            save: save,
            openDelete: openDelete,
            removeProject: removeProject,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
