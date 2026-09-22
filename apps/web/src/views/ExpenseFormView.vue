<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, ArrowLeft, CalendarDays, Check, FileText, Pencil, Plus, ReceiptText, RotateCcw, Save, Trash2, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { expenseRecords, expenseTypes as demoExpenseTypes, nextExpenseId, nextExpenseLineId, type ExpenseRecord, type ExpenseTypeRecord } from '../data/expenses';
import { projects as demoProjects } from '../data/projects';
import ProjectSearchSelect from '../components/ProjectSearchSelect.vue';

interface ProjectOption { id: number; code: string; name: string; tenderId: string; location: string }
interface FormLine { id?: number; costId: number; returnable: boolean; amount: number | ''; discount: number | ''; returnedAmount: number | ''; returnDate: string; notes: string }

const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'expense-edit');
const expenseId = computed(() => Number(route.params.id));
const backRoute = '/expenses/project-costs';
const projects = ref<ProjectOption[]>(demoProjects.map(({ id, code, name, tenderId, location }) => ({ id, code, name, tenderId, location })));
const expenseTypes = ref<ExpenseTypeRecord[]>(demoExpenseTypes.map((item) => ({ ...item })));
const loading = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref('');
const deleteOpen = ref(false);
const deleting = ref(false);
const deleteText = ref('');
const lineModalOpen = ref(false);
const editingLineIndex = ref<number | null>(null);
const lineError = ref('');
const form = reactive({ projectId: Number(route.query.projectId || 0), paymentNo: '', payTo: '', payeeAddress: '', paymentDate: new Date().toISOString().slice(0, 10), paymentType: '', referenceNo: '', referenceDate: '', notes: '', status: 'posted' as 'draft' | 'posted' | 'cancelled' });
const lines = ref<FormLine[]>([]);
const lineDraft = reactive<FormLine>({ costId: 0, returnable: false, amount: '', discount: '', returnedAmount: '', returnDate: '', notes: '' });

function dateValue(value: unknown) { return value ? String(value).slice(0, 10) : ''; }
function defaultLine(): FormLine {
  const first = expenseTypes.value.find((item) => item.active);
  return { costId: first?.id ?? 0, returnable: first?.refundable ?? false, amount: first?.defaultAmount ?? '', discount: '', returnedAmount: first?.refundable ? (first.defaultReturnAmount ?? '') : '', returnDate: '', notes: '' };
}
function setLineDraft(line: FormLine) {
  lineDraft.id = line.id;
  lineDraft.costId = line.costId;
  lineDraft.returnable = line.returnable;
  lineDraft.amount = line.amount;
  lineDraft.discount = line.discount;
  lineDraft.returnedAmount = line.returnedAmount;
  lineDraft.returnDate = line.returnDate;
  lineDraft.notes = line.notes;
}
function openNewLine() {
  if (!expenseTypes.value.some((item) => item.active)) { error.value = 'No active costs are available in EXPCOST.'; return; }
  editingLineIndex.value = null;
  lineError.value = '';
  setLineDraft(defaultLine());
  lineModalOpen.value = true;
}
function openEditLine(index: number) {
  editingLineIndex.value = index;
  lineError.value = '';
  setLineDraft(lines.value[index]!);
  lineModalOpen.value = true;
}
function closeLineModal() {
  lineModalOpen.value = false;
  lineError.value = '';
}
function saveLineDraft() {
  if (!lineDraft.costId || lineDraft.amount === '' || Number(lineDraft.amount) < 0) {
    lineError.value = 'Select a cost and enter a valid amount.';
    return;
  }
  const savedLine = { ...lineDraft };
  if (editingLineIndex.value === null) lines.value.push(savedLine);
  else lines.value.splice(editingLineIndex.value, 1, savedLine);
  closeLineModal();
}
function typeFor(line: FormLine) { return expenseTypes.value.find((item) => item.id === line.costId); }
function typeChanged(line: FormLine) { line.returnable = typeFor(line)?.refundable ?? false; if (!line.returnable) { line.returnedAmount = ''; line.returnDate = ''; } }
function lineTotal(line: FormLine) { return Math.max(0, Number(line.amount || 0) - Number(line.discount || 0) - (line.returnable ? Number(line.returnedAmount || 0) : 0)); }
const grossTotal = computed(() => lines.value.reduce((sum, line) => sum + Number(line.amount || 0), 0));
const returnedTotal = computed(() => lines.value.reduce((sum, line) => sum + (line.returnable ? Number(line.returnedAmount || 0) : 0), 0));
const netTotal = computed(() => lines.value.reduce((sum, line) => sum + lineTotal(line), 0));
function money(value: number) { return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(value); }

function fillExpense(item: ExpenseRecord) {
  form.projectId = item.projectId; form.paymentNo = item.paymentNo ?? ''; form.payTo = item.payTo ?? '';
  form.payeeAddress = item.payeeAddress ?? ''; form.paymentDate = dateValue(item.paymentDate);
  form.paymentType = item.paymentType ?? ''; form.referenceNo = item.referenceNo ?? '';
  form.referenceDate = dateValue(item.referenceDate); form.notes = item.notes ?? ''; form.status = item.status;
  lines.value = item.lines.filter((line) => line.costId).map((line) => ({ id: line.id, costId: line.costId, returnable: line.returnable, amount: Number(line.amount), discount: Number(line.discount || 0), returnedAmount: Number(line.returnedAmount || 0), returnDate: dateValue(line.returnDate), notes: line.notes ?? '' }));
}

onMounted(async () => {
  if (import.meta.env.VITE_DEMO_MODE !== 'false') {
    const existing = expenseRecords.find((item) => item.id === expenseId.value);
    if (editing.value && existing) fillExpense(existing);
    return;
  }
  loading.value = true;
  try {
    const [options, current] = await Promise.all([
      api<{ projects: ProjectOption[]; expenseTypes: ExpenseTypeRecord[] }>('/expenses/options'),
      editing.value ? api<{ expense: ExpenseRecord }>(`/expenses/${expenseId.value}`) : null,
    ]);
    projects.value = options.projects; expenseTypes.value = options.expenseTypes;
    if (current) fillExpense(current.expense);
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not load expense information.'; }
  finally { loading.value = false; }
});

async function save() {
  error.value = ''; saved.value = false;
  if (!form.projectId || !form.paymentDate) { error.value = 'Select a project and payment date.'; return; }
  if (!lines.value.length || lines.value.some((line) => !line.costId || Number(line.amount) < 0 || line.amount === '')) { error.value = 'Add at least one complete expense line.'; return; }
  saving.value = true;
  try {
    const payload = { ...form, lines: lines.value.map((line) => ({ costId: line.costId, returnable: line.returnable, amount: Number(line.amount), discount: Number(line.discount || 0), returnedAmount: line.returnable ? Number(line.returnedAmount || 0) : 0, returnDate: line.returnable ? line.returnDate : '', notes: line.notes })) };
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      await api(editing.value ? `/expenses/${expenseId.value}` : '/expenses', { method: editing.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    } else {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const id = editing.value ? expenseId.value : nextExpenseId();
      const project = projects.value.find((item) => item.id === form.projectId)!;
      let lineSeed = nextExpenseLineId();
      const record: ExpenseRecord = { id, ...form, projectCode: project.code, projectName: project.name, lines: lines.value.map((line) => { const type = typeFor(line)!; return { id: line.id ?? lineSeed++, costId: line.costId, costName: type.name, phase: type.phase, returnable: line.returnable, returnableSource: line.returnable ? 'YES' : 'NO', quantity: null, unitName: '', amount: Number(line.amount), discount: Number(line.discount || 0), returnedAmount: line.returnable ? Number(line.returnedAmount || 0) : 0, totalAmount: lineTotal(line), returnDate: line.returnable ? line.returnDate : '', notes: line.notes }; }) };
      const index = expenseRecords.findIndex((item) => item.id === id); if (index >= 0) expenseRecords[index] = record; else expenseRecords.unshift(record);
    }
    saved.value = true; setTimeout(() => router.push(backRoute), 550);
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not save the expense voucher.'; }
  finally { saving.value = false; }
}

async function removeExpense() {
  if (deleteText.value !== 'DELETE') return;
  deleting.value = true; error.value = '';
  try {
    if (import.meta.env.VITE_DEMO_MODE === 'false') await api(`/expenses/${expenseId.value}`, { method: 'DELETE' });
    else { const index = expenseRecords.findIndex((item) => item.id === expenseId.value); if (index >= 0) expenseRecords.splice(index, 1); }
    await router.push(backRoute);
  } catch (reason) { deleteOpen.value = false; error.value = reason instanceof Error ? reason.message : 'The expense voucher could not be deleted.'; }
  finally { deleting.value = false; }
}
</script>

<template>
  <section class="project-form-page expense-form-page">
    <div class="form-page-head"><RouterLink :to="backRoute" class="back-link"><ArrowLeft :size="16" /> Project Costs</RouterLink><div><span class="form-heading-icon"><ReceiptText :size="21" /></span><span><h2>{{ editing ? 'Modify cost voucher' : 'Add cost voucher' }}</h2><p>Enter before costs, project costs, and returnable lines in one voucher.</p></span></div></div>
    <form class="project-form expense-entry-form panel" @submit.prevent="save">
      <div v-if="loading" class="site-form-loading">Loading expense information…</div>
      <div class="form-section-title"><span>01</span><div><h3>Voucher details</h3><p>Project and payment date are required.</p></div></div>
      <div class="form-grid">
        <label class="form-field full"><span>Project <b>*</b></span><ProjectSearchSelect v-model="form.projectId" :projects="projects" /></label>
        <label class="form-field"><span>Voucher number</span><div><FileText :size="17" /><input v-model="form.paymentNo" placeholder="Auto or manual voucher number" /></div></label>
        <label class="form-field"><span>Payment date <b>*</b></span><div><CalendarDays :size="17" /><input v-model="form.paymentDate" type="date" required /></div></label>
        <label class="form-field"><span>Paid to</span><div><input v-model="form.payTo" placeholder="Person or office" /></div></label>
        <label class="form-field"><span>Payment type</span><div><input v-model="form.paymentType" placeholder="Cash, bank, cheque…" /></div></label>
        <label class="form-field"><span>Reference / challan</span><div><FileText :size="17" /><input v-model="form.referenceNo" placeholder="Reference number" /></div></label>
        <label class="form-field"><span>Reference date</span><div><CalendarDays :size="17" /><input v-model="form.referenceDate" type="date" /></div></label>
        <label class="form-field full"><span>Payee address</span><div><input v-model="form.payeeAddress" placeholder="Address" /></div></label>
        <label class="form-field full"><span>Notes</span><div><input v-model="form.notes" placeholder="Short voucher notes" /></div></label>
        <label class="form-field"><span>Status</span><select v-model="form.status"><option value="posted">Posted</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option></select></label>
      </div>
      <div class="form-divider"></div>
      <div class="expense-lines-head"><div class="form-section-title"><span>02</span><div><h3>Expense lines</h3><p>Lines stay temporary until the complete voucher is saved.</p></div></div><button type="button" class="secondary-button" @click="openNewLine"><Plus :size="16" /> Add line</button></div>
      <div v-if="lines.length" class="expense-lines-table-wrap">
        <table class="site-table expense-lines-table">
          <thead><tr><th>#</th><th>Cost name</th><th>Stage</th><th>Returnable</th><th>Amount</th><th>Discount</th><th>Returned</th><th>Net</th><th>Notes</th><th>Actions</th></tr></thead>
          <tbody>
            <tr v-for="(line, index) in lines" :key="line.id ?? `new-${index}`" title="Double-click to edit" @dblclick="openEditLine(index)">
              <td data-label="Line">{{ index + 1 }}</td>
              <td data-label="Cost name"><span class="expense-line-name"><strong>{{ typeFor(line)?.name ?? 'Unknown cost' }}</strong><small>ID {{ line.costId }}</small></span></td>
              <td data-label="Stage"><span class="expense-line-stage" :class="typeFor(line)?.phase">{{ typeFor(line)?.phase === 'pre_award' ? 'Before' : 'Project' }}</span></td>
              <td data-label="Returnable"><span class="expense-line-returnable" :class="line.returnable ? 'yes' : 'no'">{{ line.returnable ? 'YES' : 'NO' }}</span></td>
              <td data-label="Amount">{{ money(Number(line.amount || 0)) }}</td>
              <td data-label="Discount">{{ money(Number(line.discount || 0)) }}</td>
              <td data-label="Returned">{{ line.returnable ? money(Number(line.returnedAmount || 0)) : '—' }}</td>
              <td data-label="Net"><strong class="expense-amount">{{ money(lineTotal(line)) }}</strong></td>
              <td data-label="Notes"><span class="expense-line-notes">{{ line.notes || '—' }}</span></td>
              <td data-label="Actions"><div class="line-actions"><button type="button" title="Edit line" @click="openEditLine(index)"><Pencil :size="14" /></button><button type="button" class="danger" title="Remove temporary line" @click="lines.splice(index, 1)"><Trash2 :size="14" /></button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="expense-lines-empty"><ReceiptText :size="23" /><strong>No expense lines</strong><span>Add lines in the popup. They will be saved with the voucher.</span><button type="button" class="secondary-button" @click="openNewLine"><Plus :size="16" /> Add first line</button></div>
      <div class="expense-total-bar"><span><small>Gross</small><strong>{{ money(grossTotal) }}</strong></span><span><small>Returned</small><strong>{{ money(returnedTotal) }}</strong></span><span class="net"><small>Net expense</small><strong>{{ money(netTotal) }}</strong></span></div>
      <p v-if="error" class="form-error form-message">{{ error }}</p><p v-if="saved" class="save-success"><Check :size="16" /> Expense saved. Returning to the list…</p>
      <footer class="form-actions"><button v-if="editing" type="button" class="delete-project-button" @click="deleteText = ''; deleteOpen = true"><Trash2 :size="16" /> Delete voucher</button><RouterLink :to="backRoute" class="secondary-button">Cancel</RouterLink><button class="primary-button" :disabled="saving"><Save :size="17" />{{ saving ? 'Saving…' : editing ? 'Save changes' : 'Add expense' }}</button></footer>
    </form>
    <div v-if="lineModalOpen" class="modal-backdrop" @click.self="closeLineModal"><section class="expense-line-modal"><button type="button" class="modal-close" @click="closeLineModal"><X :size="18" /></button><header><span><ReceiptText :size="20" /></span><div><h2>{{ editingLineIndex === null ? 'Add expense line' : `Edit expense line ${editingLineIndex + 1}` }}</h2><p>This line is temporary until you save the voucher.</p></div></header><div class="expense-line-grid"><label class="form-field full"><span>Cost name <b>*</b></span><select v-model.number="lineDraft.costId" @change="typeChanged(lineDraft)"><optgroup label="Before costs"><option v-for="type in expenseTypes.filter((item) => item.active && item.phase === 'pre_award')" :key="type.id" :value="type.id">{{ type.name }} · ID {{ type.id }}{{ type.refundable ? ' · Returnable' : '' }}</option></optgroup><optgroup label="Project costs"><option v-for="type in expenseTypes.filter((item) => item.active && item.phase === 'execution')" :key="type.id" :value="type.id">{{ type.name }} · ID {{ type.id }}{{ type.refundable ? ' · Returnable' : '' }}</option></optgroup></select></label><label class="form-field"><span>Cost stage</span><div class="expense-stage-preview"><strong>{{ typeFor(lineDraft)?.phase === 'pre_award' ? 'Before cost' : 'Project cost' }}</strong></div></label><label class="form-field"><span>Returnable <small>Defaults from selected cost</small></span><select v-model="lineDraft.returnable"><option :value="true">YES</option><option :value="false">NO</option></select></label><label class="form-field"><span>Amount <b>*</b></span><div><input v-model.number="lineDraft.amount" type="number" min="0" step="0.01" placeholder="0.00" /></div></label><label class="form-field"><span>Discount</span><div><input v-model.number="lineDraft.discount" type="number" min="0" step="0.01" placeholder="0.00" /></div></label><label v-if="lineDraft.returnable" class="form-field"><span>Returned amount</span><div><RotateCcw :size="16" /><input v-model.number="lineDraft.returnedAmount" type="number" min="0" step="0.01" placeholder="0.00" /></div></label><label v-if="lineDraft.returnable" class="form-field"><span>Return date</span><div><CalendarDays :size="16" /><input v-model="lineDraft.returnDate" type="date" /></div></label><label class="form-field full"><span>Line notes</span><div><input v-model="lineDraft.notes" placeholder="Optional details" /></div></label></div><p v-if="lineError" class="form-error modal-error">{{ lineError }}</p><footer><span>Net line amount <strong>{{ money(lineTotal(lineDraft)) }}</strong></span><button type="button" class="secondary-button" @click="closeLineModal">Cancel</button><button type="button" class="primary-button" @click="saveLineDraft"><Check :size="16" />{{ editingLineIndex === null ? 'Add temporary line' : 'Update temporary line' }}</button></footer></section></div>
    <div v-if="deleteOpen" class="modal-backdrop" @click.self="deleteOpen = false"><section class="delete-modal"><button class="modal-close" @click="deleteOpen = false"><X :size="18" /></button><span class="delete-modal-icon"><AlertTriangle :size="24" /></span><h2>Delete this expense voucher?</h2><p>All lines owned by this voucher will also be removed. Deletion is prevented if another module references the voucher.</p><label class="delete-confirm-field"><span>Type <b>DELETE</b> to confirm</span><input v-model="deleteText" placeholder="DELETE" /></label><div class="modal-actions"><button class="secondary-button" @click="deleteOpen = false">Cancel</button><button class="danger-button" :disabled="deleteText !== 'DELETE' || deleting" @click="removeExpense"><Trash2 :size="16" />{{ deleting ? 'Deleting…' : 'Delete voucher' }}</button></div></section></div>
  </section>
</template>
