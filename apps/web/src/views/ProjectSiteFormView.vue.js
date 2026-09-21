import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, Check, MapPin, Save, Trash2, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { nextProjectSiteId, projectSites } from '../data/projectSites';
import { projects } from '../data/projects';
import ProjectSearchSelect from '../components/ProjectSearchSelect.vue';
const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'project-site-edit');
const siteId = computed(() => Number(route.params.id));
const existing = computed(() => projectSites.find((site) => site.id === siteId.value));
const saving = ref(false);
const loading = ref(false);
const saved = ref(false);
const error = ref('');
const deleteOpen = ref(false);
const deleting = ref(false);
const deleteText = ref('');
const form = reactive({
    projectId: existing.value?.projectId ?? Number(route.query.projectId || projects[0]?.id || 0),
    name: existing.value?.name ?? '',
    address: existing.value?.address ?? '',
    status: existing.value?.status ?? 'active',
});
onMounted(async () => {
    if (!editing.value || import.meta.env.VITE_DEMO_MODE !== 'false')
        return;
    loading.value = true;
    try {
        const result = await api(`/project-sites/${siteId.value}`);
        form.projectId = result.site.projectId;
        form.name = result.site.name;
        form.address = result.site.address ?? '';
        form.status = result.site.status;
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load the project site.';
    }
    finally {
        loading.value = false;
    }
});
async function save() {
    error.value = '';
    saved.value = false;
    if (!form.projectId || !form.name.trim()) {
        error.value = 'Select a project and enter the site name.';
        return;
    }
    saving.value = true;
    try {
        const payload = { projectId: Number(form.projectId), name: form.name.trim(), address: form.address.trim(), status: form.status };
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            await api(editing.value ? `/project-sites/${siteId.value}` : '/project-sites', { method: editing.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 450));
            const project = projects.find((item) => item.id === payload.projectId);
            const record = { id: editing.value ? siteId.value : nextProjectSiteId(), projectId: payload.projectId, projectName: project.name, projectCode: project.code, name: payload.name, address: payload.address, status: payload.status };
            const index = projectSites.findIndex((site) => site.id === record.id);
            if (index >= 0)
                projectSites[index] = record;
            else
                projectSites.unshift(record);
        }
        saved.value = true;
        setTimeout(() => router.push('/projects/sites'), 550);
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save the project site.';
    }
    finally {
        saving.value = false;
    }
}
async function removeSite() {
    if (deleteText.value !== 'DELETE')
        return;
    deleting.value = true;
    error.value = '';
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            await api(`/project-sites/${siteId.value}`, { method: 'DELETE' });
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 450));
            const index = projectSites.findIndex((site) => site.id === siteId.value);
            if (index >= 0)
                projectSites.splice(index, 1);
        }
        await router.push('/projects/sites');
    }
    catch (reason) {
        deleteOpen.value = false;
        error.value = reason instanceof Error ? reason.message : 'This site could not be deleted because referenced data may exist.';
    }
    finally {
        deleting.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "project-form-page site-form-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-page-head" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/projects/sites",
    ...{ class: "back-link" },
}));
const __VLS_2 = __VLS_1({
    to: "/projects/sites",
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
const __VLS_8 = {}.MapPin;
/** @type {[typeof __VLS_components.MapPin, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (21),
}));
const __VLS_10 = __VLS_9({
    size: (21),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.editing ? 'Modify project site' : 'Add project site');
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.editing ? 'Update the site information below.' : 'Choose the project and enter the site details.');
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.save) },
    ...{ class: "project-form site-entry-form panel" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "site-form-loading" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "site-form-intro" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
/** @type {[typeof ProjectSearchSelect, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(ProjectSearchSelect, new ProjectSearchSelect({
    modelValue: (__VLS_ctx.form.projectId),
    projects: (__VLS_ctx.projects),
}));
const __VLS_13 = __VLS_12({
    modelValue: (__VLS_ctx.form.projectId),
    projects: (__VLS_ctx.projects),
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_15 = {}.MapPin;
/** @type {[typeof __VLS_components.MapPin, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    size: (17),
}));
const __VLS_17 = __VLS_16({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "e.g. Government Primary School, Bochaganj",
    required: true,
});
(__VLS_ctx.form.name);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_19 = {}.MapPin;
/** @type {[typeof __VLS_components.MapPin, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
    size: (17),
}));
const __VLS_21 = __VLS_20({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Village, upazila, district",
});
(__VLS_ctx.form.address);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.form.status),
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
    const __VLS_23 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
        size: (16),
    }));
    const __VLS_25 = __VLS_24({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "form-actions" },
});
if (__VLS_ctx.editing) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editing))
                    return;
                __VLS_ctx.deleteText = '';
                __VLS_ctx.deleteOpen = true;
            } },
        type: "button",
        ...{ class: "delete-project-button" },
    });
    const __VLS_27 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
        size: (16),
    }));
    const __VLS_29 = __VLS_28({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
}
const __VLS_31 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    to: "/projects/sites",
    ...{ class: "secondary-button" },
}));
const __VLS_33 = __VLS_32({
    to: "/projects/sites",
    ...{ class: "secondary-button" },
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
__VLS_34.slots.default;
var __VLS_34;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "primary-button" },
    disabled: (__VLS_ctx.saving),
});
const __VLS_35 = {}.Save;
/** @type {[typeof __VLS_components.Save, ]} */ ;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
    size: (17),
}));
const __VLS_37 = __VLS_36({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_36));
(__VLS_ctx.saving ? 'Saving…' : __VLS_ctx.editing ? 'Save changes' : 'Add site');
if (__VLS_ctx.deleteOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.deleteOpen))
                    return;
                __VLS_ctx.deleteOpen = false;
            } },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "delete-modal" },
        role: "dialog",
        'aria-modal': "true",
        'aria-labelledby': "site-delete-title",
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
    const __VLS_39 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
        size: (18),
    }));
    const __VLS_41 = __VLS_40({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "delete-modal-icon" },
    });
    const __VLS_43 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        size: (24),
    }));
    const __VLS_45 = __VLS_44({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        id: "site-delete-title",
    });
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
    (__VLS_ctx.deleteText);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.deleteOpen))
                    return;
                __VLS_ctx.deleteOpen = false;
            } },
        ...{ class: "secondary-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.removeSite) },
        ...{ class: "danger-button" },
        disabled: (__VLS_ctx.deleteText !== 'DELETE' || __VLS_ctx.deleting),
    });
    const __VLS_47 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
        size: (16),
    }));
    const __VLS_49 = __VLS_48({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_48));
    (__VLS_ctx.deleting ? 'Deleting…' : 'Delete site');
}
/** @type {__VLS_StyleScopedClasses['project-form-page']} */ ;
/** @type {__VLS_StyleScopedClasses['site-form-page']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-head']} */ ;
/** @type {__VLS_StyleScopedClasses['back-link']} */ ;
/** @type {__VLS_StyleScopedClasses['form-heading-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['project-form']} */ ;
/** @type {__VLS_StyleScopedClasses['site-entry-form']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['site-form-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['site-form-intro']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
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
/** @type {__VLS_StyleScopedClasses['delete-confirm-field']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['danger-button']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AlertTriangle: AlertTriangle,
            ArrowLeft: ArrowLeft,
            Check: Check,
            MapPin: MapPin,
            Save: Save,
            Trash2: Trash2,
            X: X,
            projects: projects,
            ProjectSearchSelect: ProjectSearchSelect,
            editing: editing,
            saving: saving,
            loading: loading,
            saved: saved,
            error: error,
            deleteOpen: deleteOpen,
            deleting: deleting,
            deleteText: deleteText,
            form: form,
            save: save,
            removeSite: removeSite,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
