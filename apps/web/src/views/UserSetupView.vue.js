import { computed, onMounted, reactive, ref } from 'vue';
import { Check, KeyRound, LoaderCircle, Pencil, Plus, Search, Trash2, UserRound, UsersRound, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
const auth = useAuthStore();
const users = ref([]);
const roles = ref([]);
const projects = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const saved = ref('');
const search = ref('');
const modalOpen = ref(false);
const editingId = ref(null);
const form = reactive({ username: '', firstName: '', lastName: '', email: '', roleId: 0, status: 'active', password: '', projectIds: [] });
const canManage = computed(() => auth.hasPermission('admin.users.manage'));
const canDelete = computed(() => auth.hasPermission('admin.users.delete'));
const filteredUsers = computed(() => {
    const term = search.value.trim().toLowerCase();
    return users.value.filter((user) => !term || `${user.firstName} ${user.lastName ?? ''} ${user.username} ${user.email} ${user.roleName}`.toLowerCase().includes(term));
});
async function load() {
    loading.value = true;
    error.value = '';
    try {
        const [list, options] = await Promise.all([
            api('/users'),
            api('/users/options'),
        ]);
        users.value = list.users;
        roles.value = options.roles;
        projects.value = options.projects;
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not load users.';
    }
    finally {
        loading.value = false;
    }
}
function openCreate() {
    editingId.value = null;
    Object.assign(form, { username: '', firstName: '', lastName: '', email: '', roleId: roles.value.find((role) => role.key === 'users')?.id ?? roles.value[0]?.id ?? 0, status: 'active', password: '', projectIds: [] });
    error.value = '';
    saved.value = '';
    modalOpen.value = true;
}
function openEdit(user) {
    editingId.value = user.id;
    Object.assign(form, { username: user.username, firstName: user.firstName, lastName: user.lastName ?? '', email: user.email, roleId: user.roleId, status: user.status, password: '', projectIds: [...user.projectIds] });
    error.value = '';
    saved.value = '';
    modalOpen.value = true;
}
async function saveUser() {
    if (!form.username.trim() || !form.firstName.trim() || !form.email.trim() || !form.roleId || (!editingId.value && form.password.length < 8)) {
        error.value = 'Complete the required fields. New passwords must contain at least 8 characters.';
        return;
    }
    saving.value = true;
    error.value = '';
    saved.value = '';
    try {
        const body = { ...form, lastName: form.lastName || null, ...(form.password ? { password: form.password } : {}) };
        const result = await api(editingId.value ? `/users/${editingId.value}` : '/users', { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(body) });
        saved.value = result.message;
        modalOpen.value = false;
        await load();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not save user.';
    }
    finally {
        saving.value = false;
    }
}
async function deleteUser(user) {
    if (!window.confirm(`Delete user ${user.username}? This removes their personal menu and project assignments.`))
        return;
    error.value = '';
    saved.value = '';
    try {
        const result = await api(`/users/${user.id}`, { method: 'DELETE' });
        saved.value = result.message;
        await load();
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Could not delete user.';
    }
}
function toggleProject(projectId) {
    form.projectIds = form.projectIds.includes(projectId) ? form.projectIds.filter((id) => id !== projectId) : [...form.projectIds, projectId];
}
onMounted(load);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "admin-setup-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-intro" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
if (__VLS_ctx.canManage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openCreate) },
        ...{ class: "primary-button" },
    });
    const __VLS_0 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        size: (17),
    }));
    const __VLS_2 = __VLS_1({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
if (__VLS_ctx.error && !__VLS_ctx.modalOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "form-error" },
    });
    (__VLS_ctx.error);
}
if (__VLS_ctx.saved) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "save-success" },
    });
    const __VLS_4 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        size: (15),
    }));
    const __VLS_6 = __VLS_5({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    (__VLS_ctx.saved);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "panel admin-list-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "table-search" },
});
const __VLS_8 = {}.Search;
/** @type {[typeof __VLS_components.Search, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (16),
}));
const __VLS_10 = __VLS_9({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Search user, email, or group…",
});
(__VLS_ctx.search);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.filteredUsers.length);
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "access-loading" },
    });
    const __VLS_12 = {}.LoaderCircle;
    /** @type {[typeof __VLS_components.LoaderCircle, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: (22),
        ...{ class: "spin" },
    }));
    const __VLS_14 = __VLS_13({
        size: (22),
        ...{ class: "spin" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "admin-user-table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "admin-user-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [user] of __VLS_getVForSourceType((__VLS_ctx.filteredUsers))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (user.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "User",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "user-cell" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
        const __VLS_16 = {}.UserRound;
        /** @type {[typeof __VLS_components.UserRound, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            size: (17),
        }));
        const __VLS_18 = __VLS_17({
            size: (17),
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (user.firstName);
        (user.lastName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (user.username);
        (user.email);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Group",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "role-chip" },
        });
        (user.roleName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Projects",
        });
        (user.projectIds.length ? `${user.projectIds.length} assigned` : 'All / not limited');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Status",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "status-pill" },
            ...{ class: (user.status) },
        });
        (user.status);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            'data-label': "Last login",
        });
        (user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "row-actions" },
        });
        if (__VLS_ctx.canManage) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.canManage))
                            return;
                        __VLS_ctx.openEdit(user);
                    } },
                ...{ class: "icon-button" },
                title: "Edit user",
            });
            const __VLS_20 = {}.Pencil;
            /** @type {[typeof __VLS_components.Pencil, ]} */ ;
            // @ts-ignore
            const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
                size: (15),
            }));
            const __VLS_22 = __VLS_21({
                size: (15),
            }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        }
        if (__VLS_ctx.canDelete && user.id !== __VLS_ctx.auth.user?.id && user.roleKey !== 'programmer') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.canDelete && user.id !== __VLS_ctx.auth.user?.id && user.roleKey !== 'programmer'))
                            return;
                        __VLS_ctx.deleteUser(user);
                    } },
                ...{ class: "icon-button danger-icon" },
                title: "Delete user",
            });
            const __VLS_24 = {}.Trash2;
            /** @type {[typeof __VLS_components.Trash2, ]} */ ;
            // @ts-ignore
            const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
                size: (15),
            }));
            const __VLS_26 = __VLS_25({
                size: (15),
            }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        }
    }
    if (!__VLS_ctx.filteredUsers.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "6",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "site-empty" },
        });
        const __VLS_28 = {}.UsersRound;
        /** @type {[typeof __VLS_components.UsersRound, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            size: (22),
        }));
        const __VLS_30 = __VLS_29({
            size: (22),
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
if (__VLS_ctx.modalOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onMousedown: (...[$event]) => {
                if (!(__VLS_ctx.modalOpen))
                    return;
                __VLS_ctx.modalOpen = false;
            } },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveUser) },
        ...{ class: "admin-entry-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "role-icon big" },
    });
    const __VLS_32 = {}.UserRound;
    /** @type {[typeof __VLS_components.UserRound, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        size: (21),
    }));
    const __VLS_34 = __VLS_33({
        size: (21),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.editingId ? 'Update user' : 'Create user');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.modalOpen))
                    return;
                __VLS_ctx.modalOpen = false;
            } },
        type: "button",
        ...{ class: "icon-button" },
    });
    const __VLS_36 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        size: (18),
    }));
    const __VLS_38 = __VLS_37({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    if (__VLS_ctx.error) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "form-error" },
        });
        (__VLS_ctx.error);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "admin-form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        maxlength: "50",
        required: true,
    });
    (__VLS_ctx.form.username);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "email",
        maxlength: "120",
        required: true,
    });
    (__VLS_ctx.form.email);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        maxlength: "50",
        required: true,
    });
    (__VLS_ctx.form.firstName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        maxlength: "50",
    });
    (__VLS_ctx.form.lastName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.form.roleId),
        required: true,
    });
    for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roles))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (role.id),
            value: (role.id),
        });
        (role.name);
    }
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "locked",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-field full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_40 = {}.KeyRound;
    /** @type {[typeof __VLS_components.KeyRound, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        size: (13),
    }));
    const __VLS_42 = __VLS_41({
        size: (13),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    (__VLS_ctx.editingId ? '(leave blank to keep current)' : '*');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "password",
        required: (!__VLS_ctx.editingId),
        minlength: "8",
        autocomplete: "new-password",
    });
    (__VLS_ctx.form.password);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.fieldset, __VLS_intrinsicElements.fieldset)({
        ...{ class: "project-access-field full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.legend, __VLS_intrinsicElements.legend)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    for (const [project] of __VLS_getVForSourceType((__VLS_ctx.projects))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            key: (project.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (...[$event]) => {
                    if (!(__VLS_ctx.modalOpen))
                        return;
                    __VLS_ctx.toggleProject(project.id);
                } },
            type: "checkbox",
            checked: (__VLS_ctx.form.projectIds.includes(project.id)),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (project.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (project.code || `Project #${project.id}`);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.modalOpen))
                    return;
                __VLS_ctx.modalOpen = false;
            } },
        type: "button",
        ...{ class: "secondary-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "primary-button" },
        disabled: (__VLS_ctx.saving),
    });
    if (__VLS_ctx.saving) {
        const __VLS_44 = {}.LoaderCircle;
        /** @type {[typeof __VLS_components.LoaderCircle, ]} */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
            size: (16),
            ...{ class: "spin" },
        }));
        const __VLS_46 = __VLS_45({
            size: (16),
            ...{ class: "spin" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    }
    else {
        const __VLS_48 = {}.Check;
        /** @type {[typeof __VLS_components.Check, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
            size: (16),
        }));
        const __VLS_50 = __VLS_49({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    }
    (__VLS_ctx.saving ? 'Saving…' : 'Save user');
}
/** @type {__VLS_StyleScopedClasses['admin-setup-page']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-intro']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['save-success']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-list-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['table-search']} */ ;
/** @type {__VLS_StyleScopedClasses['access-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['spin']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-user-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-user-table']} */ ;
/** @type {__VLS_StyleScopedClasses['user-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['role-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['danger-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['site-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-entry-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['role-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['big']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['form-error']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['project-access-field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['spin']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Check: Check,
            KeyRound: KeyRound,
            LoaderCircle: LoaderCircle,
            Pencil: Pencil,
            Plus: Plus,
            Search: Search,
            Trash2: Trash2,
            UserRound: UserRound,
            UsersRound: UsersRound,
            X: X,
            auth: auth,
            roles: roles,
            projects: projects,
            loading: loading,
            saving: saving,
            error: error,
            saved: saved,
            search: search,
            modalOpen: modalOpen,
            editingId: editingId,
            form: form,
            canManage: canManage,
            canDelete: canDelete,
            filteredUsers: filteredUsers,
            openCreate: openCreate,
            openEdit: openEdit,
            saveUser: saveUser,
            deleteUser: deleteUser,
            toggleProject: toggleProject,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
