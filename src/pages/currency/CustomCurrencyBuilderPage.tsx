import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Save, Trash2, Share2, Copy, Check, Play, AlertCircle, Download, X,
} from 'lucide-react';
import {
  useCustomCurrencies, useCreateCustomCurrency, useUpdateCustomCurrency,
  useDeleteCustomCurrency, usePreviewCustomCurrency, useSetShareCustomCurrency,
  useSharedRule, useImportSharedRule,
} from '../../hooks/useCustomCurrency';
import { ruleToYaml, yamlToInput, STARTER_YAML, YamlRuleError } from '../../lib/customCurrencyYaml';
import { CustomCurrencyCard } from '../../components/currency/CustomCurrencyCard';
import type {
  CustomCurrencyEvaluation, CustomRuleInput, CustomCurrencyRuleBody,
} from '../../types/customCurrency';
import { METRIC_OPTIONS } from '../../types/customCurrency';

/** Extract a share token from a pasted value: a raw token or a URL with ?share=. */
function parseShareToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const t = url.searchParams.get('share');
    if (t) return t;
  } catch {
    /* not a URL — treat as raw token */
  }
  return trimmed;
}

function metricLabel(metric: string): string {
  return METRIC_OPTIONS.find((m) => m.value === metric)?.label ?? metric;
}

/** A read-only, non-technical rendering of a parsed rule as stacked blocks. */
function BlocksPreview({ definition }: { definition: CustomCurrencyRuleBody }) {
  return (
    <div className="space-y-2" data-testid="blocks-preview">
      <div className="rounded-lg border border-sky-200 bg-sky-50/60 dark:border-sky-800/50 dark:bg-sky-900/15 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-sky-700 dark:text-sky-300">Timeframe</p>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Look back over the last {definition.window?.amount} {definition.window?.unit}
        </p>
      </div>
      {definition.filters && definition.filters.length > 0 && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/60 dark:border-violet-800/50 dark:bg-violet-900/15 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-violet-700 dark:text-violet-300">Only these flights</p>
          <ul className="text-sm text-slate-700 dark:text-slate-200 list-disc list-inside">
            {definition.filters.map((f, i) => (
              <li key={i}>
                {f.field.replace(/_/g, ' ')}
                {f.op === 'eq' && ` = ${f.value}`}
                {f.op === 'in' && ` in ${(f.values ?? []).join(', ')}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-900/15 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-emerald-700 dark:text-emerald-300">You need</p>
        <ul className="text-sm text-slate-700 dark:text-slate-200 list-disc list-inside">
          {definition.requirements?.map((r, i) => (
            <li key={i}>
              at least {r.min} {r.label || metricLabel(r.metric)}
              {r.unit ? ` (${r.unit})` : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [yamlText, setYamlText] = useState<string>(STARTER_YAML);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<CustomCurrencyEvaluation | null>(null);
  const [importValue, setImportValue] = useState('');
  const [copied, setCopied] = useState(false);

  const currentRule = editingId ? rules?.find((r) => r.rule.id === editingId) : undefined;

  // Parse the YAML on every change so the block preview and buttons react.
  const parsed = useMemo<{ input?: CustomRuleInput; error?: string }>(() => {
    try {
      return { input: yamlToInput(yamlText) };
    } catch (e) {
      return { error: e instanceof YamlRuleError ? e.message : 'Invalid rule' };
    }
  }, [yamlText]);

  const parseError = parsed.error ?? null;

  // Debounced live preview against the user's real flights. All state updates
  // happen inside the timeout callback (never synchronously in the effect body).
  const previewRef = useRef(preview);
  previewRef.current = preview;
  useEffect(() => {
    const definition = parsed.input?.definition;
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
  }, [parsed.input]);

  function startNew() {
    setEditingId(null);
    setYamlText(STARTER_YAML);
    setSaveError(null);
  }

  function loadRule(id: string) {
    const item = rules?.find((r) => r.rule.id === id);
    if (!item) return;
    setEditingId(id);
    setYamlText(ruleToYaml(item.rule));
    setSaveError(null);
  }

  async function handleSave() {
    if (!parsed.input) return;
    setSaveError(null);
    try {
      if (editingId) {
        await updateRule.mutateAsync({ id: editingId, input: parsed.input });
      } else {
        const created = await createRule.mutateAsync(parsed.input);
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
            {/* YAML editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Rule (YAML)</h2>
                <span className="text-xs text-slate-400">{editingId ? 'Editing' : 'New'}</span>
              </div>
              <textarea
                value={yamlText}
                onChange={(e) => setYamlText(e.target.value)}
                spellCheck={false}
                rows={20}
                className="input font-mono text-xs leading-relaxed w-full"
                data-testid="yaml-editor"
              />
              {parseError && (
                <p className="text-xs text-red-600 inline-flex items-start gap-1.5" data-testid="parse-error">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {parseError}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleSave} disabled={!parsed.input || saving} className="btn-primary text-sm inline-flex items-center gap-1.5" data-testid="save-rule">
                  <Save className="w-4 h-4" /> {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create rule'}
                </button>
                <button
                  type="button"
                  onClick={() => parsed.input && preview.mutate(parsed.input.definition, { onSuccess: setEvaluation })}
                  disabled={!parsed.input}
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
              {parsed.input ? (
                <>
                  <BlocksPreview definition={parsed.input.definition} />
                  {evaluation ? (
                    <CustomCurrencyCard
                      item={{
                        rule: {
                          id: 'preview', userId: '', name: parsed.input.name,
                          description: parsed.input.description, emoji: parsed.input.emoji,
                          definition: parsed.input.definition, isShared: false,
                          createdAt: '', updatedAt: '',
                        },
                        evaluation,
                      }}
                    />
                  ) : (
                    <p className="text-xs text-slate-400">{preview.isPending ? 'Evaluating against your flights…' : 'Preview updates as you type.'}</p>
                  )}
                </>
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
