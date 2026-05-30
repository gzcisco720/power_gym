import { useEffect, useReducer, useState } from 'react';
import { m } from 'framer-motion';
import { variants } from '@/lib/animations/variants';
import { toast } from 'sonner';
import { ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { AddEquipmentDialog } from '@/components/owner/add-equipment-dialog';
import { EditEquipmentDialog, STATUS_COLOURS } from '@/components/owner/edit-equipment-dialog';
import type { EquipmentItem, EquipmentStatus } from '@/api/equipment';

type FilterTab = 'all' | EquipmentStatus;
const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

function isOverdue(nextServiceDate: string | null): boolean {
  return nextServiceDate !== null && new Date(nextServiceDate) < new Date();
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatServiceDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

interface PageState {
  showAdd: boolean;
  editTarget: EquipmentItem | null;
  deletingId: string | null;
}

type PageAction =
  | { type: 'SET_SHOW_ADD'; value: boolean }
  | { type: 'SET_EDIT_TARGET'; item: EquipmentItem | null }
  | { type: 'SET_DELETING_ID'; id: string | null };

function pageReducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case 'SET_SHOW_ADD': return { ...state, showAdd: action.value };
    case 'SET_EDIT_TARGET': return { ...state, editTarget: action.item };
    case 'SET_DELETING_ID': return { ...state, deletingId: action.id };
    default: return state;
  }
}

export function OwnerEquipmentPage() {
  const { items, isLoading, fetch, remove } = useEquipmentStore();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [pageState, dispatch] = useReducer(pageReducer, {
    showAdd: false, editTarget: null, deletingId: null,
  });
  const { showAdd, editTarget, deletingId } = pageState;

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const visibleItems = filter === 'all' ? items : items.filter((i) => i.status === filter);
  const subtitle = isLoading ? undefined : `${items.length} item${items.length !== 1 ? 's' : ''} in catalogue`;

  async function handleDelete(id: string) {
    dispatch({ type: 'SET_DELETING_ID', id });
    try {
      await remove(id);
      toast.success('Equipment deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      dispatch({ type: 'SET_DELETING_ID', id: null });
    }
  }

  return (
    <div>
      <PageHeader title="Equipment" subtitle={subtitle} />
      <div className="px-4 sm:px-8 py-7">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-foreground/5 p-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilter(tab.value)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    filter === tab.value
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-foreground/40 hover:text-foreground/65'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <Button onClick={() => dispatch({ type: 'SET_SHOW_ADD', value: true })}>
              + Add Equipment
            </Button>
          </div>

          {visibleItems.length === 0 && !isLoading && (
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-8 text-center">
              <p className="text-[13px] text-foreground/40">
                {items.length === 0 ? 'No equipment added yet.' : 'No equipment matches this filter.'}
              </p>
            </div>
          )}

          {visibleItems.length > 0 && (
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_140px_60px_140px_120px_60px] border-b border-foreground/[.06] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-[1.5px] text-foreground/40">
                <div>Name</div>
                <div>Brand</div>
                <div>Qty</div>
                <div>Status</div>
                <div></div>
                <div></div>
              </div>

              <m.div variants={variants.staggerContainer} initial="hidden" animate="visible">
                {visibleItems.map((item) => (
                  <m.div
                    key={item._id}
                    variants={variants.staggerItem}
                    className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_60px_140px_120px_60px] items-center px-5 py-3.5 border-b border-foreground/5 last:border-0 gap-2"
                  >
                    <div className="flex items-center gap-3">
                      {item.images?.[0] ? (
                        <div className="size-8 rounded-md border border-foreground/10 shrink-0 overflow-hidden">
                          <img src={item.images[0]} alt={item.name} className="size-full object-cover" />
                        </div>
                      ) : (
                        <div aria-label="No image" className="size-8 rounded-md border border-foreground/[.06] bg-foreground/5 flex items-center justify-center shrink-0">
                          <ImageIcon className="size-3.5 text-foreground/20" />
                        </div>
                      )}
                      <div>
                        <div className="text-[13px] font-medium text-foreground">{item.name}</div>
                        {item.note && <div className="text-[11px] text-foreground/40 mt-0.5">{item.note}</div>}
                      </div>
                    </div>

                    <div className="hidden sm:block text-[12px] text-foreground/40">{item.brand ?? '—'}</div>

                    <div className="hidden sm:block text-[12px] text-foreground/40">{item.quantity}</div>

                    <div className="hidden sm:flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        {item.trackCondition ? (
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOURS[item.status]}`}>
                            {item.status}
                          </span>
                        ) : (
                          <span className="text-[11px] text-foreground/20">N/A</span>
                        )}
                        {isOverdue(item.nextServiceDate) && (
                          <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                            Overdue
                          </span>
                        )}
                      </div>
                      {item.nextServiceDate && (
                        <div className={`text-[10px] ${isOverdue(item.nextServiceDate) ? 'text-amber-400/70' : 'text-foreground/40'}`}>
                          {isOverdue(item.nextServiceDate) ? 'Was due' : 'Due'}: {formatServiceDate(item.nextServiceDate)}
                        </div>
                      )}
                    </div>

                    <div className="hidden sm:flex justify-center">
                      <Button
                        variant="ghost"
                        onClick={() => dispatch({ type: 'SET_EDIT_TARGET', item })}
                        className="text-foreground/40 hover:text-foreground/65 hover:bg-muted text-xs h-7 px-3"
                      >
                        Edit
                      </Button>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(item._id)}
                        disabled={deletingId === item._id}
                        className="text-foreground/40 hover:text-destructive hover:bg-muted text-xs h-7 px-2 disabled:opacity-50"
                      >
                        {deletingId === item._id ? <Loader2 className="size-3 animate-spin" /> : 'Delete'}
                      </Button>
                    </div>
                  </m.div>
                ))}
              </m.div>
            </div>
          )}
        </div>
      </div>

      <AddEquipmentDialog
        open={showAdd}
        onClose={() => dispatch({ type: 'SET_SHOW_ADD', value: false })}
        onCreated={() => dispatch({ type: 'SET_SHOW_ADD', value: false })}
      />

      <EditEquipmentDialog
        equipment={editTarget}
        onClose={() => dispatch({ type: 'SET_EDIT_TARGET', item: null })}
        onUpdated={() => dispatch({ type: 'SET_EDIT_TARGET', item: null })}
      />
    </div>
  );
}
