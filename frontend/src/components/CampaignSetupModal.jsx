// ─── CampaignSetupModal ─ Phase 1 of the Campaign Hub ──────────────
// Shown BEFORE a new SuperPage is created. Forces the user to decide
// where leads from this page will go (List) and what email sequence
// will run on capture (Sequence). Both decisions default to "Skip"
// to make the choice explicit rather than silent — users can pick
// "Auto-create", "Use existing X", or "Skip" for each.
//
// On confirm: emits a payload of { default_list_id?, create_new_list_name?,
// capture_sequence_id? } that gets merged into the page-create call.
//
// Required-mode: there's no close-X. User must click "Create my page"
// or "Cancel" (which aborts the create entirely). This matches the
// product decision locked 18 May 2026: campaign binding is required
// at create time, not deferred.

import { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';
import { X, List, Send, Plus, ArrowRight } from 'lucide-react';

export default function CampaignSetupModal({
  // Suggested name for the auto-create list. Usually `<Page title> leads`.
  // The modal pre-fills the auto-create input with this.
  suggestedListName = 'New campaign leads',
  // What we're creating — string used in the "Create my <X>" button
  // and header copy. Defaults to "page" but can be "campaign" or similar.
  pageTypeLabel = 'page',
  // Fired when user clicks "Create my page". Receives a payload object
  // ready to merge into the page-create API call. Shape:
  //   {
  //     default_list_id?: number,        // bind to existing list
  //     create_new_list_name?: string,   // auto-create with this name
  //     capture_sequence_id?: number,    // bind to existing sequence
  //   }
  // Absence of all three = user skipped both decisions (orphan page).
  onConfirm,
  // Fired when user clicks Cancel — usually aborts the page-create flow.
  onCancel,
  // Phase 1.5 — when re-wiring an existing page, pass the current
  // binding state so the modal pre-selects the right radio rows
  // and dropdown values. Falsy values = "Skip" (matches the create-
  // flow default).
  initialListId = null,
  initialSequenceId = null,
  // When set, the modal renders in edit-mode: title changes from
  // "Set up your campaign" to "Edit campaign wiring", the confirm
  // button reads "Save changes" instead of "Create my page".
  editMode = false,
  // Page title shown in the edit-mode subtitle, so the user knows
  // which page they're editing. Optional.
  editingPageTitle = null,
}) {
  // Modes for each field: 'skip' (default), 'create', 'existing'
  // In edit mode, we pre-select 'existing' if the page already has a binding.
  const [listMode, setListMode] = useState(initialListId ? 'existing' : 'skip');
  const [seqMode, setSeqMode] = useState(initialSequenceId ? 'existing' : 'skip');
  // For listMode='existing'
  const [selectedListId, setSelectedListId] = useState(initialListId);
  // For listMode='create' — editable name (pre-filled with suggested)
  const [newListName, setNewListName] = useState(suggestedListName);
  // For seqMode='existing'
  const [selectedSeqId, setSelectedSeqId] = useState(initialSequenceId);
  // Lists + sequences from the API
  const [options, setOptions] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Load existing options on mount. Quiet error handling — if the
  // endpoint fails the user can still skip and bind later.
  useEffect(() => {
    apiGet('/api/funnels/setup-options')
      .then(d => setOptions(d || { lists: [], sequences: [] }))
      .catch(err => {
        console.error('Setup options load failed:', err);
        setLoadError(err.message || 'Could not load your lists and sequences');
        setOptions({ lists: [], sequences: [] });
      });
  }, []);

  // Update the new-list-name placeholder if the suggested name changes
  // (parent might recompute it from the page title).
  useEffect(() => {
    if (listMode === 'create' && !newListName.trim()) {
      setNewListName(suggestedListName);
    }
  }, [suggestedListName, listMode]);

  const handleConfirm = () => {
    const payload = {};
    // List path
    if (listMode === 'existing' && selectedListId) {
      payload.default_list_id = selectedListId;
    } else if (listMode === 'create' && newListName.trim()) {
      payload.create_new_list_name = newListName.trim().slice(0, 100);
    }
    // Sequence path
    if (seqMode === 'existing' && selectedSeqId) {
      payload.capture_sequence_id = selectedSeqId;
    }
    onConfirm(payload);
  };

  // Validation — disable confirm if user picked 'existing' but didn't
  // pick a specific item, or 'create' with an empty name.
  const listValid =
    listMode === 'skip' ||
    (listMode === 'create' && newListName.trim().length > 0) ||
    (listMode === 'existing' && !!selectedListId);
  const seqValid =
    seqMode === 'skip' ||
    (seqMode === 'existing' && !!selectedSeqId);
  const canConfirm = listValid && seqValid && options !== null;

  const hasLists = (options?.lists || []).length > 0;
  const hasSeqs = (options?.sequences || []).length > 0;

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(10,20,56,.55)',
      zIndex:300, display:'flex', alignItems:'center', justifyContent:'center',
      backdropFilter:'blur(6px)', padding:16,
    }}>
      <div style={{
        background:'#fff', borderRadius:16, width:'100%', maxWidth:560,
        maxHeight:'90vh', overflowY:'auto',
        boxShadow:'0 24px 60px rgba(10,20,56,.35)',
      }}>
        {/* Header */}
        <div style={{
          padding:'24px 28px 16px',
          borderBottom:'1px solid #e8ecf2',
        }}>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:6}}>
            <div style={{
              width:32, height:32, borderRadius:8,
              background:'linear-gradient(135deg,#0a1438 0%,#1e3a8a 100%)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {editMode ? <Send size={16} color="#fff" strokeWidth={2.5}/> : <Plus size={16} color="#fff" strokeWidth={2.5}/>}
            </div>
            <h2 style={{
              margin:0, fontFamily:'Sora,sans-serif', fontSize:18,
              fontWeight:800, color:'#0a1438', letterSpacing:'-0.01em',
            }}>{editMode ? 'Edit campaign wiring' : 'Set up your campaign'}</h2>
          </div>
          <p style={{
            margin:0, fontSize:13, color:'#475569', lineHeight:1.5,
          }}>
            {editMode ? (
              <>Change where leads from <strong>{editingPageTitle || 'this page'}</strong> go,
              or which sequence runs on capture. Changes apply to future
              captures only — existing leads stay where they are.</>
            ) : (
              <>Pick where leads from this {pageTypeLabel} go, and which
              email sequence runs on capture. Both are optional but
              recommended — wired campaigns convert far better.</>
            )}
          </p>
        </div>

        {/* Body */}
        <div style={{padding:'20px 28px 24px'}}>

          {loadError && (
            <div style={{
              background:'#fff7ed', border:'1px solid #fed7aa',
              color:'#9a3412', borderRadius:8, padding:'8px 12px',
              fontSize:12, fontWeight:600, marginBottom:16,
            }}>
              Couldn't load your existing lists/sequences: {loadError}.
              You can still pick "Skip" or auto-create.
            </div>
          )}

          {/* ─── LIST SECTION ─── */}
          <SectionHeader
            icon={List}
            title="Lead list"
            subtitle="Where do leads from this page get stored?"
          />
          <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:24}}>
            <RadioRow
              label="Skip for now"
              hint="Leads will land unbound. You can move them later from SuperLeads."
              selected={listMode === 'skip'}
              onClick={() => setListMode('skip')}
            />
            <RadioRow
              label="Auto-create a new list"
              hint={`A new list will be created for this page.`}
              selected={listMode === 'create'}
              onClick={() => setListMode('create')}>
              {listMode === 'create' && (
                <input
                  type="text"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  placeholder={suggestedListName}
                  maxLength={100}
                  style={{
                    width:'100%', marginTop:8, padding:'8px 12px',
                    border:'1px solid #cbd5e1', borderRadius:6,
                    fontSize:13, fontFamily:'inherit', boxSizing:'border-box',
                  }}
                />
              )}
            </RadioRow>
            <RadioRow
              label={`Use an existing list${hasLists ? '' : ' (none yet)'}`}
              hint={hasLists ? 'Pick one of your existing lists.' : 'Create one in SuperLeads first to use this option.'}
              selected={listMode === 'existing'}
              onClick={() => hasLists && setListMode('existing')}
              disabled={!hasLists}>
              {listMode === 'existing' && hasLists && (
                <select
                  value={selectedListId || ''}
                  onChange={e => setSelectedListId(parseInt(e.target.value) || null)}
                  style={{
                    width:'100%', marginTop:8, padding:'8px 12px',
                    border:'1px solid #cbd5e1', borderRadius:6,
                    fontSize:13, fontFamily:'inherit', boxSizing:'border-box',
                    background:'#fff',
                  }}>
                  <option value="">— Pick a list —</option>
                  {options.lists.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.lead_count} {l.lead_count === 1 ? 'lead' : 'leads'})
                    </option>
                  ))}
                </select>
              )}
            </RadioRow>
          </div>

          {/* ─── SEQUENCE SECTION ─── */}
          <SectionHeader
            icon={Send}
            title="Email sequence (autoresponder)"
            subtitle="What automated emails run after capture?"
          />
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <RadioRow
              label="Skip for now"
              hint="No autoresponder will run. Leads still land in your CRM."
              selected={seqMode === 'skip'}
              onClick={() => setSeqMode('skip')}
            />
            <RadioRow
              label={`Use an existing sequence${hasSeqs ? '' : ' (none yet)'}`}
              hint={hasSeqs ? 'Pick one of your existing sequences.' : 'Create a sequence in SuperLeads → Sequences first.'}
              selected={seqMode === 'existing'}
              onClick={() => hasSeqs && setSeqMode('existing')}
              disabled={!hasSeqs}>
              {seqMode === 'existing' && hasSeqs && (
                <select
                  value={selectedSeqId || ''}
                  onChange={e => setSelectedSeqId(parseInt(e.target.value) || null)}
                  style={{
                    width:'100%', marginTop:8, padding:'8px 12px',
                    border:'1px solid #cbd5e1', borderRadius:6,
                    fontSize:13, fontFamily:'inherit', boxSizing:'border-box',
                    background:'#fff',
                  }}>
                  <option value="">— Pick a sequence —</option>
                  {options.sequences.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.num_emails} {s.num_emails === 1 ? 'email' : 'emails'})
                    </option>
                  ))}
                </select>
              )}
            </RadioRow>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding:'16px 28px 24px',
          borderTop:'1px solid #e8ecf2',
          display:'flex', gap:10, justifyContent:'flex-end',
        }}>
          <button
            onClick={onCancel}
            style={{
              padding:'10px 18px', borderRadius:8,
              border:'1px solid #cbd5e1', background:'#fff',
              color:'#475569', fontSize:13, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit',
            }}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              padding:'10px 18px', borderRadius:8, border:'none',
              background: canConfirm
                ? 'linear-gradient(135deg,#0a1438 0%,#1e3a8a 100%)'
                : '#cbd5e1',
              color:'#fff', fontSize:13, fontWeight:700,
              cursor: canConfirm ? 'pointer' : 'not-allowed',
              fontFamily:'Sora,sans-serif',
              display:'flex', alignItems:'center', gap:6,
            }}>
            {editMode ? 'Save changes' : `Create my ${pageTypeLabel}`} <ArrowRight size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SectionHeader ─ icon + title + subtitle row above each section ─
function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:2}}>
        <Icon size={14} color="#0ea5e9" strokeWidth={2.2}/>
        <span style={{
          fontFamily:'Sora,sans-serif', fontSize:13, fontWeight:800,
          color:'#0a1438', letterSpacing:'-0.005em',
        }}>{title}</span>
      </div>
      <div style={{fontSize:12, color:'#64748b', paddingLeft:22}}>{subtitle}</div>
    </div>
  );
}

// ─── RadioRow ─ one selectable row inside a section ──────────────
// Highlighted state = cobalt border + light cobalt tint background.
// Disabled state = muted text and ignored clicks. Children appear
// inside the row (below the label+hint) when selected, used for the
// per-option input or dropdown.
function RadioRow({ label, hint, selected, onClick, disabled, children }) {
  return (
    <div
      onClick={() => !disabled && onClick()}
      style={{
        padding:'10px 14px', borderRadius:8,
        border: selected ? '2px solid #1e3a8a' : '1px solid #e8ecf2',
        background: selected ? 'rgba(30,58,138,.04)' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition:'all .15s',
      }}>
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <div style={{
          width:16, height:16, borderRadius:'50%',
          border:`2px solid ${selected ? '#1e3a8a' : '#cbd5e1'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
        }}>
          {selected && (
            <div style={{
              width:8, height:8, borderRadius:'50%', background:'#1e3a8a',
            }}/>
          )}
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{
            fontSize:13, fontWeight:700, color:'#0a1438',
            fontFamily:'Sora,sans-serif',
          }}>{label}</div>
          <div style={{fontSize:12, color:'#64748b', marginTop:1}}>{hint}</div>
        </div>
      </div>
      {children}
    </div>
  );
}
