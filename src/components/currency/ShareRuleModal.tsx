import { useState } from 'react';
import { Share2, Copy, Check, Link2Off, Loader2 } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { useSetShareCustomCurrency } from '../../hooks/useCustomCurrency';
import type { CustomCurrencyRule } from '../../types/customCurrency';

interface Props {
  rule: CustomCurrencyRule;
  onClose: () => void;
}

/**
 * Share modal for a custom currency rule. Sharing is opt-in: the owner enables
 * it to mint a link, can copy it, and can stop sharing (which revokes the
 * token so the old link no longer resolves).
 */
export function ShareRuleModal({ rule, onClose }: Props) {
  const setShare = useSetShareCustomCurrency();
  const [copied, setCopied] = useState(false);

  const shareLink = rule.shareToken
    ? `${window.location.origin}/currency/builder?share=${rule.shareToken}`
    : null;

  async function copyLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Share “${rule.name}”`}
      description="Anyone with the link can preview this rule and import a copy into their own logbook. Your flights are never shared."
    >
      {rule.isShared && shareLink ? (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Share link</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                readOnly
                value={shareLink}
                onFocus={(e) => e.target.select()}
                className="input text-xs flex-1"
                data-testid="share-modal-link"
              />
              <button type="button" onClick={copyLink} className="btn-secondary text-sm inline-flex items-center gap-1.5 shrink-0" data-testid="share-modal-copy">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShare.mutate({ id: rule.id, shared: false })}
              disabled={setShare.isPending}
              className="btn-ghost text-sm text-red-600 inline-flex items-center gap-1.5"
              data-testid="share-modal-stop"
            >
              {setShare.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2Off className="w-4 h-4" />}
              Stop sharing
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This rule is private. Create a link to share it with other pilots.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShare.mutate({ id: rule.id, shared: true })}
              disabled={setShare.isPending}
              className="btn-primary text-sm inline-flex items-center gap-1.5"
              data-testid="share-modal-create"
            >
              {setShare.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              Create share link
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
