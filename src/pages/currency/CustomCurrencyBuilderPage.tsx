import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Save, Trash2, Share2, Copy, Check, Play, AlertCircle, Download, X, Blocks, Code2,
} from 'lucide-react';
import {
  useCustomCurrencies, useCreateCustomCurrency, useUpdateCustomCurrency,
  useDeleteCustomCurrency, usePreviewCustomCurrency, useSetShareCustomCurrency,
  useSharedRule, useImportSharedRule,
} from '../../hooks/useCustomCurrency';
import { ruleToYaml, yamlToInput, STARTER_YAML, YamlRuleError } from '../../lib/customCurrencyYaml';
import { CustomCurrencyCard } from '../../components/currency/CustomCurrencyCard';
import { CustomCurrencyBlockEditor } from '../../components/currency/CustomCurrencyBlockEditor';
import type {
  CustomCurrencyEvaluation, CustomRuleInput, CustomCurrencyRule,
} from '../../types/customCurrency';

type Mode = 'blocks' | 'yaml';

const STARTER_DRAFT: CustomRuleInput = yamlToInput(STARTER_YAML);

/** Map a stored rule to the editable input shape. */
function ruleToInput(rule: CustomCurrencyRule): CustomRuleInput {
  return { name: rule.name, emoji: rule.emoji ?? null, description: rule.description ?? null, definition: rule.definition };
}

/** Light client-side check so Save/Preview only fire on a plausible rule. The
 *  API performs full validation. */
function validateDraft(input: CustomRuleInput): string | null {
  if (!input.name.trim()) return 'Give your rule a name.';
  if (!input.definition.window || input.definition.window.amount <= 0) return 'Set a timeframe greater than zero.';
  if (!input.definition.requirements || input.definition.requirements.length === 0) return 'Add at least one requirement.';
  return null;
}

/** Extract a share token from a pasted value: a raw token or a URL with ?share=. */
function parseShareToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const t = new URL(trimmed).searchParams.get('share');
    if (t) return t;
  } catch {
    /* not a URL — treat as raw token */
  }
  return trimmed;
}

export default function CustomCurrencyBuilderPage() {
  const [params, setParams] = useSearchParams();
  const shareParam = params.get('share');

  const { data: rules, isLoading } = useCustomCurrencies();
  const createRule = useCreateCustomCurrency();
  const updateRule = useUpdateCustomCurrency();
  const deleteRule = useDeleteCustomCurrency();
  const preview = usePreviewCustomCurrency();
  const setShare = useSetShareCustomCurrency();
  const importRule = useImportSharedRule();
  const sharedRule = useSharedRule(shareParam);

  const [mode, setMode] = useState<Mode>('blocks');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CustomRuleInput>(STARTER_DRAFT);
  const [yamlText, setYamlText] = useState<string>(STARTER_YAML);
  const [modeError, setModeError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<CustomCurrencyEvaluation | null>(null);
  const [importValue, setImportValue] = useState('');
  const [copied, setCopied] = useState(false);

  const currentRule = editingId ? rules?.find((r) => r.rule.id === editingId) : undefined;

  // The current input + error depend on the active editing surface.
  const current = useMemo<{ input?: CustomRuleInput; error?: string }>(() => {
    if (mode === 'yaml') {
      try {
        return { input: yamlToInput(yamlText) };
      } catch (e) {
        return { error: e instanceof YamlRuleError ? e.message : 'Invalid rule' };
      }
    }
    const err = validateDraft(draft);
    return err ? { input: draft, error: err } : { input: draft };
  }, [mode, yamlText, draft]);

  // Debounced live preview against real flights. State updates only happen
  // inside the timeout callback, never synchronously in the effect body.
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const previewInput = current.error ? undefined : current.input;
  useEffect(() => {
    const definition = previewInput?.definition;
    const handle = setTimeout(() => {
      if (!definition) {
        setEvaluation(null);
        return;
      }
      previewRef.current.mutate(definition, {
        onSuccess: (res) => setEvaluation(res),
        onError: () => setEvaluation(null),
      });
    }, 500);
    return () => clearTimeout(handle);
  }, [previewInput]);

  function switchMode(next: Mode) {
    if (next === mode) return;
    setModeError(null);
    if (next === 'yaml') {
      setYamlText(ruleToYaml(draft));
      setMode('yaml');
    } else {
      try {
        setDraft(yamlToInput(yamlText));
        setMode('blocks');
      } catch (e) {
        setModeError(e instanceof YamlRuleError ? e.message : 'Fix the YAML before switching to blocks.');
      }
    }
  }

  function startNew() {
    setEditingId(null);
    setDraft(STARTER_DRAFT);
    setYamlText(STARTER_YAML);
    setSaveError(null);
  }

  function loadRule(id: string) {
    const item = rules?.find((r) => r.rule.id === id);
    if (!item) return;
    setEditingId(id);
    setDraft(ruleToInput(item.rule));
    setYamlText(ruleToYaml(item.rule));
    setSaveError(null);
  }

  async function handleSave() {
    if (!current.input || current.error) return;
    setSaveError(null);
    try {
      if (editingId) {
        await updateRule.mutateAsync({ id: editingId, input: current.input });
      } else {
        const created = await createRule.mutateAsync(current.input);
        setEditingId(created.rule.id);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    await deleteRule.mutateAsync(editingId);
    startNew();
  }

  async function handleShareToggle() {
    if (!editingId || !currentRule) return;
    await setShare.mutateAsync({ id: editingId, shared: !currentRule.rule.isShared });
  }

  const shareLink = currentRule?.rule.shareToken
    ? `${window.location.origin}/currency/builder?share=${currentRule.rule.shareToken}`
    : null;

  async function copyShareLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleImport() {
    const token = parseShareToken(importValue);
    if (!token) return;
    const imported = await importRule.mutateAsync(token);
    setImportValue('');
    loadRule(imported.rule.id);
  }

  async function importFromShareParam() {
    if (!shareParam) return;
    const imported = await importRule.mutateAsync(shareParam);
    dismissShareBanner();
    loadRule(imported.rule.id);
  }

  function dismissShareBanner() {
    const next = new URLSearchParams(params);
    next.delete('share');
    setParams(next, { replace: true });
  }

  const saving = createRule.isPending || updateRule.isPending;
  const canSave = !!current.input && !current.error;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/currency" className="btn-ghost inline-flex items-center gap-1.5 text-sm" data-testid="back-to-currency">
          <ArrowLeft className="w-4 h-4" /> Currency
        </Link>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Custom currency builder</h1>
      </div>

      {/* Incoming share link */}
      {shareParam && (
        <div className="card border-l-4 border-l-sky-500 bg-sky-50/50 dark:bg-sky-900/15" data-testid="share-import-banner">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-2">
                <Download className="w-4 h-4" /> Someone shared a currency rule with you
              </p>
              {sharedRule.isLoading && <p className="text-sm text-slate-500 mt-1">Loading…</p>}
              {sharedRule.isError && <p className="text-sm text-red-600 mt-1">This share link is no longer valid.</p>}
              {sharedRule.data && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {sharedRule.data.emoji} <strong>{sharedRule.data.name}</strong>
                  {sharedRule.data.description ? ` — ${sharedRule.data.description}` : ''}
                </p>
              )}
            </div>
            <button type="button" onClick={dismissShareBanner} className="btn-ghost p-1" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
          {sharedRule.data && (
            <div className="mt-3">
              <button
                type="button"
                onClick={importFromShareParam}
                disabled={importRule.isPending}
                className="btn-primary text-sm inline-flex items-center gap-1.5"
                data-testid="import-shared-rule"
              >
                <Download className="w-4 h-4" /> {importRule.isPending ? 'Importing…' : 'Import into my rules'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-4">
        {/* Rule list */}
        <aside className="space-y-3">
          <button type="button" onClick={startNew} className="btn-primary w-full inline-flex items-center justify-center gap-1.5" data-testid="new-rule">
            <Plus className="w-4 h-4" /> New rule
          </button>

          <div className="space-y-2">
            {isLoading && <p className="text-sm text-slate-500">Loading your rules…</p>}
            {rules && rules.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No custom rules yet. Create one, or import a shared rule below.</p>
            )}
            {rules?.map((item) => (
              <button
                key={item.rule.id}
                type="button"
                onClick={() => loadRule(item.rule.id)}
                className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                  editingId === item.rule.id
                    ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                data-testid={`rule-list-item-${item.rule.id}`}
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span aria-hidden="true">{item.rule.emoji || '📋'}</span>
                  <span className="truncate font-medium text-slate-700 dark:text-slate-200">{item.rule.name}</span>
                </span>
                <span
                  className={`ml-2 inline-block w-2 h-2 rounded-full align-middle ${
                    item.evaluation.status === 'current' ? 'bg-green-500' : item.evaluation.status === 'expired' ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>

          {/* Import box */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Import a shared rule</label>
            <input
              type="text"
              value={importValue}
              onChange={(e) => setImportValue(e.target.value)}
              placeholder="Paste a share link or code"
              className="input text-sm"
              data-testid="import-token-input"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={!importValue.trim() || importRule.isPending}
              className="btn-secondary w-full text-sm inline-flex items-center justify-center gap-1.5"
              data-testid="import-token-button"
            >
              <Download className="w-4 h-4" /> Import
            </button>
            {importRule.isError && <p className="text-xs text-red-600">{(importRule.error as Error).message}</p>}
          </div>
        </aside>

        {/* Editor + preview */}
        <section className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {/* Mode toggle */}
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5" role="tablist" aria-label="Editor mode">
                  <button
                    type="button"
                    onClick={() => switchMode('blocks')}
                    className={`text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 ${mode === 'blocks' ? 'bg-sky-500 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                    data-testid="mode-blocks"
                    aria-selected={mode === 'blocks'}
                    role="tab"
                  >
                    <Blocks className="w-3.5 h-3.5" /> Blocks
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('yaml')}
                    className={`text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 ${mode === 'yaml' ? 'bg-sky-500 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                    data-testid="mode-yaml"
                    aria-selected={mode === 'yaml'}
                    role="tab"
                  >
                    <Code2 className="w-3.5 h-3.5" /> YAML
                  </button>
                </div>
                <span className="text-xs text-slate-400">{editingId ? 'Editing' : 'New'}</span>
              </div>

              {modeError && (
                <p className="text-xs text-red-600 inline-flex items-start gap-1.5" data-testid="mode-error">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {modeError}
                </p>
              )}

              {mode === 'blocks' ? (
                <CustomCurrencyBlockEditor value={draft} onChange={setDraft} />
              ) : (
                <textarea
                  value={yamlText}
                  onChange={(e) => setYamlText(e.target.value)}
                  spellCheck={false}
                  rows={22}
                  className="input font-mono text-xs leading-relaxed w-full min-h-[24rem] resize-y"
                  data-testid="yaml-editor"
                />
              )}

              {current.error && (
                <p className="text-xs text-red-600 inline-flex items-start gap-1.5" data-testid="rule-error">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {current.error}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleSave} disabled={!canSave || saving} className="btn-primary text-sm inline-flex items-center gap-1.5" data-testid="save-rule">
                  <Save className="w-4 h-4" /> {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create rule'}
                </button>
                <button
                  type="button"
                  onClick={() => canSave && current.input && preview.mutate(current.input.definition, { onSuccess: setEvaluation })}
                  disabled={!canSave}
                  className="btn-secondary text-sm inline-flex items-center gap-1.5"
                  data-testid="preview-rule"
                >
                  <Play className="w-4 h-4" /> Preview
                </button>
                {editingId && (
                  <>
                    <button type="button" onClick={handleShareToggle} disabled={setShare.isPending} className="btn-ghost text-sm inline-flex items-center gap-1.5" data-testid="toggle-share">
                      <Share2 className="w-4 h-4" /> {currentRule?.rule.isShared ? 'Stop sharing' : 'Share'}
                    </button>
                    <button type="button" onClick={handleDelete} disabled={deleteRule.isPending} className="btn-ghost text-sm text-red-600 inline-flex items-center gap-1.5" data-testid="delete-rule">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </>
                )}
              </div>
              {saveError && <p className="text-xs text-red-600" data-testid="save-error">{saveError}</p>}

              {shareLink && currentRule?.rule.isShared && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 flex items-center gap-2" data-testid="share-link-box">
                  <input readOnly value={shareLink} className="input text-xs flex-1" onFocus={(e) => e.target.select()} />
                  <button type="button" onClick={copyShareLink} className="btn-secondary text-xs inline-flex items-center gap-1" data-testid="copy-share-link">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>

            {/* Live preview */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Live preview</h2>
              {current.input ? (
                evaluation ? (
                  <CustomCurrencyCard
                    item={{
                      rule: {
                        id: 'preview', userId: '', name: current.input.name,
                        description: current.input.description, emoji: current.input.emoji,
                        definition: current.input.definition, isShared: false,
                        createdAt: '', updatedAt: '',
                      },
                      evaluation,
                    }}
                  />
                ) : (
                  <p className="text-xs text-slate-400">{preview.isPending ? 'Evaluating against your flights…' : 'Preview updates as you edit.'}</p>
                )
              ) : (
                <p className="text-sm text-slate-400">Fix the rule to see a preview.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
