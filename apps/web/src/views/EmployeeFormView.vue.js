import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, Check, Hash, Mail, MapPin, Phone, Save, Trash2, UserRoundCog, WalletCards, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { employeeRecords, nextEmployeeId } from '../data/employees';
import { employeeAssignments } from '../data/assignments';
const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'employee-edit');
const employeeId = computed(() => Number(route.params.id));
const existing = computed(() => employeeRecords.find((employee) => employee.id === employeeId.value));
const loading = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref('');
const deleteOpen = ref(false);
const deleteLoading = ref(false);
const deleting = ref(false);
const deleteText = ref('');
const deleteCheck = ref(null);
const form = reactive({
    employeeCode: existing.value?.employeeCode ?? '',
    firstName: existing.value?.firstName ?? '',
    lastName: existing.value?.lastName ?? '',
    dateOfBirth: existing.value?.dateOfBirth ?? '',
    phone: existing.value?.phone ?? '',
    email: existing.value?.email ?? '',
    hireDate: existing.value?.hireDate ?? '',
    salary: existing.value?.salary ?? '',
    department: existing.value?.department ?? '',
    address: existing.value?.address ?? '',
    status: existing.value?.status ?? 'active',
});
function fillForm(employee) {
    form.employeeCode = employee.employeeCode ?? '';
    form.firstName = employee.firstName ?? '';
    form.lastName = employee.lastName ?? '';
    form.dateOfBirth = employee.dateOfBirth ?? '';
    form.phone = employee.phone ?? '';
    form.email = employee.email ?? '';
    form.hireDate = employee.hireDate ?? '';
    form.salary = employee.salary ?? '';
    form.department = employee.department ?? '';
    form.address = employee.address ?? '';
    form.status = employee.status;
}
onMounted(async () => {
    if (!editing.value || import.meta.env.VITE_DEMO_MODE !== 'false')
        return;
    loading.value = true;
    try {
        const result = await api(`/employees/${employeeId.value}`);
        fillForm(result.employee);
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load the employee.';
    }
    finally {
        loading.value = false;
    }
});
async function save() {
    error.value = '';
    saved.value = false;
    if (!form.firstName.trim()) {
        error.value = 'Enter the employee first name.';
        return;
    }
    const parsedSalary = form.salary === '' || form.salary === null ? null : Number(form.salary);
    if (parsedSalary !== null && (!Number.isFinite(parsedSalary) || parsedSalary < 0)) {
        error.value = 'Enter a valid salary.';
        return;
    }
    saving.value = true;
    try {
        const payload = {
            employeeCode: form.employeeCode.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim(),
            dateOfBirth: form.dateOfBirth, phone: form.phone.trim(), email: form.email.trim(), hireDate: form.hireDate,
            salary: parsedSalary, department: form.department.trim(), address: form.address.trim(), status: form.status,
        };
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            await api(editing.value ? `/employees/${employeeId.value}` : '/employees', { method: editing.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 450));
            const id = editing.value ? employeeId.value : nextEmployeeId();
            const current = employeeRecords.find((employee) => employee.id === id);
            const record = {
                id,
                ...payload,
                employeeCode: payload.employeeCode || `EMP-${id}`,
                name: `${payload.firstName} ${payload.lastName}`.replace(/\s+/g, ' ').trim(),
                projectCount: current?.projectCount ?? 0,
                siteCount: current?.siteCount ?? 0,
            };
            const index = employeeRecords.findIndex((employee) => employee.id === id);
            if (index >= 0)
                employeeRecords[index] = record;
            else
                employeeRecords.unshift(record);
            const assignment = employeeAssignments.find((item) => item.id === id);
            if (assignment)
                Object.assign(assignment, { employeeCode: record.employeeCode, name: record.name, phone: record.phone, email: record.email, address: record.address, status: record.status });
            else
                employeeAssignments.push({ id, employeeCode: record.employeeCode, name: record.name, phone: record.phone, email: record.email, address: record.address, status: record.status, projects: [], sites: [] });
        }
        saved.value = true;
        setTimeout(() => router.push('/workforce/employees'), 550);
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save the employee.';
    }
    finally {
        saving.value = false;
    }
}
async function openDelete() {
    deleteOpen.value = true;
    deleteText.value = '';
    deleteCheck.value = null;
    deleteLoading.value = true;
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            deleteCheck.value = await api(`/employees/${employeeId.value}/delete-check`);
        }
        else {
            deleteCheck.value = { canDelete: (existing.value?.projectCount ?? 0) + (existing.value?.siteCount ?? 0) === 0, references: { projects: existing.value?.projectCount ?? 0, sites: existing.value?.siteCount ?? 0 } };
        }
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not check employee references.';
        deleteOpen.value = false;
    }
    finally {
        deleteLoading.value = false;
    }
}
async function removeEmployee() {
    if (!deleteCheck.value?.canDelete || deleteText.value !== 'DELETE')
        return;
    deleting.value = true;
    error.value = '';
    try {
        if (import.meta.env.VITE_DEMO_MODE === 'false') {
            await api(`/employees/${employeeId.value}`, { method: 'DELETE' });
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 450));
            const index = employeeRecords.findIndex((employee) => employee.id === employeeId.value);
            if (index >= 0)
                employeeRecords.splice(index, 1);
            const assignmentIndex = employeeAssignments.findIndex((employee) => employee.id === employeeId.value);
            if (assignmentIndex >= 0)
                employeeAssignments.splice(assignmentIndex, 1);
        }
        await router.push('/workforce/employees');
    }
    catch (reason) {
        deleteOpen.value = false;
        error.value = reason instanceof Error ? reason.message : 'This employee could not be deleted because referenced data exists.';
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
    ...{ class: "project-form-page employee-form-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-page-head" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/workforce/employees",
    ...{ class: "back-link" },
}));
const __VLS_2 = __VLS_1({
    to: "/workforce/employees",
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
(__VLS_ctx.editing ? 'Modify employee' : 'Add employee');
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.save) },
    ...{ class: "project-form panel" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "site-form-loading" },
    });
}
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
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_12 = {}.Hash;
/** @type {[typeof __VLS_components.Hash, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    size: (17),
}));
const __VLS_14 = __VLS_13({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "e.g. E-06",
});
(__VLS_ctx.form.employeeCode);
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
    value: "inactive",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_16 = {}.UserRoundCog;
/** @type {[typeof __VLS_components.UserRoundCog, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    size: (17),
}));
const __VLS_18 = __VLS_17({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "First name",
    required: true,
});
(__VLS_ctx.form.firstName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_20 = {}.UserRoundCog;
/** @type {[typeof __VLS_components.UserRoundCog, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    size: (17),
}));
const __VLS_22 = __VLS_21({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Last name",
});
(__VLS_ctx.form.lastName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_24 = {}.Phone;
/** @type {[typeof __VLS_components.Phone, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    size: (17),
}));
const __VLS_26 = __VLS_25({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "tel",
    placeholder: "01XXXXXXXXX",
});
(__VLS_ctx.form.phone);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_28 = {}.Mail;
/** @type {[typeof __VLS_components.Mail, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    size: (17),
}));
const __VLS_30 = __VLS_29({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "email",
    placeholder: "employee@example.com",
});
(__VLS_ctx.form.email);
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
(__VLS_ctx.form.dateOfBirth);
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
(__VLS_ctx.form.hireDate);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_40 = {}.WalletCards;
/** @type {[typeof __VLS_components.WalletCards, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    size: (17),
}));
const __VLS_42 = __VLS_41({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "0",
    step: "0.01",
    placeholder: "0.00",
});
(__VLS_ctx.form.salary);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_44 = {}.Building2;
/** @type {[typeof __VLS_components.Building2, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    size: (17),
}));
const __VLS_46 = __VLS_45({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Site Engineer",
});
(__VLS_ctx.form.department);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-field full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_48 = {}.MapPin;
/** @type {[typeof __VLS_components.MapPin, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    size: (17),
}));
const __VLS_50 = __VLS_49({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Village, upazila, district",
});
(__VLS_ctx.form.address);
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
    const __VLS_52 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        size: (16),
    }));
    const __VLS_54 = __VLS_53({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
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
    const __VLS_56 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        size: (16),
    }));
    const __VLS_58 = __VLS_57({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
}
if (__VLS_ctx.editing) {
    const __VLS_60 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        to: (`/projects/assignments/${__VLS_ctx.employeeId}/edit`),
        ...{ class: "secondary-button" },
    }));
    const __VLS_62 = __VLS_61({
        to: (`/projects/assignments/${__VLS_ctx.employeeId}/edit`),
        ...{ class: "secondary-button" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    __VLS_63.slots.default;
    var __VLS_63;
}
const __VLS_64 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    to: "/workforce/employees",
    ...{ class: "secondary-button" },
}));
const __VLS_66 = __VLS_65({
    to: "/workforce/employees",
    ...{ class: "secondary-button" },
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
var __VLS_67;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "primary-button" },
    disabled: (__VLS_ctx.saving),
});
const __VLS_68 = {}.Save;
/** @type {[typeof __VLS_components.Save, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    size: (17),
}));
const __VLS_70 = __VLS_69({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
(__VLS_ctx.saving ? 'Saving…' : __VLS_ctx.editing ? 'Save changes' : 'Add employee');
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
        'aria-labelledby': "employee-delete-title",
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
    const __VLS_72 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        size: (18),
    }));
    const __VLS_74 = __VLS_73({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "delete-modal-icon" },
    });
    const __VLS_76 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        size: (24),
    }));
    const __VLS_78 = __VLS_77({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        id: "employee-delete-title",
    });
    if (__VLS_ctx.deleteLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else if (__VLS_ctx.deleteCheck && !__VLS_ctx.deleteCheck.canDelete) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "delete-blocked" },
        });
        const __VLS_80 = {}.AlertTriangle;
        /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
            size: (19),
        }));
        const __VLS_82 = __VLS_81({
            size: (19),
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "reference-list" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.deleteCheck.references.projects);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.deleteCheck.references.sites);
        const __VLS_84 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
            ...{ 'onClick': {} },
            to: (`/projects/assignments/${__VLS_ctx.employeeId}/edit`),
            ...{ class: "primary-button modal-done" },
        }));
        const __VLS_86 = __VLS_85({
            ...{ 'onClick': {} },
            to: (`/projects/assignments/${__VLS_ctx.employeeId}/edit`),
            ...{ class: "primary-button modal-done" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        let __VLS_88;
        let __VLS_89;
        let __VLS_90;
        const __VLS_91 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.deleteOpen))
                    return;
                if (!!(__VLS_ctx.deleteLoading))
                    return;
                if (!(__VLS_ctx.deleteCheck && !__VLS_ctx.deleteCheck.canDelete))
                    return;
                __VLS_ctx.deleteOpen = false;
            }
        };
        __VLS_87.slots.default;
        var __VLS_87;
    }
    else if (__VLS_ctx.deleteCheck) {
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
                    if (!!(__VLS_ctx.deleteLoading))
                        return;
                    if (!!(__VLS_ctx.deleteCheck && !__VLS_ctx.deleteCheck.canDelete))
                        return;
                    if (!(__VLS_ctx.deleteCheck))
                        return;
                    __VLS_ctx.deleteOpen = false;
                } },
            ...{ class: "secondary-button" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.removeEmployee) },
            ...{ class: "danger-button" },
            disabled: (__VLS_ctx.deleteText !== 'DELETE' || __VLS_ctx.deleting),
        });
        const __VLS_92 = {}.Trash2;
        /** @type {[typeof __VLS_components.Trash2, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
            size: (16),
        }));
        const __VLS_94 = __VLS_93({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_93));
        (__VLS_ctx.deleting ? 'Deleting…' : 'Delete employee');
    }
}
/** @type {__VLS_StyleScopedClasses['project-form-page']} */ ;
/** @type {__VLS_StyleScopedClasses['employee-form-page']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-head']} */ ;
/** @type {__VLS_StyleScopedClasses['back-link']} */ ;
/** @type {__VLS_StyleScopedClasses['form-heading-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['project-form']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['site-form-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['form-message']} */ ;
/** @type {__VLS_StyleScopedClasses['save-success']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-project-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-modal-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-blocked']} */ ;
/** @type {__VLS_StyleScopedClasses['reference-list']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-done']} */ ;
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
            Building2: Building2,
            CalendarDays: CalendarDays,
            Check: Check,
            Hash: Hash,
            Mail: Mail,
            MapPin: MapPin,
            Phone: Phone,
            Save: Save,
            Trash2: Trash2,
            UserRoundCog: UserRoundCog,
            WalletCards: WalletCards,
            X: X,
            editing: editing,
            employeeId: employeeId,
            loading: loading,
            saving: saving,
            saved: saved,
            error: error,
            deleteOpen: deleteOpen,
            deleteLoading: deleteLoading,
            deleting: deleting,
            deleteText: deleteText,
            deleteCheck: deleteCheck,
            form: form,
            save: save,
            openDelete: openDelete,
            removeEmployee: removeEmployee,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
