import { LitElement } from 'lit';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
import type { RemovalSummary } from './foundation/removal-plan.js';
export type { RemovalSummary };
declare const OscdRemovalConfirmation_base: typeof LitElement & import("@open-wc/dedupe-mixin").Constructor<import("@open-wc/scoped-elements/types.js").ScopedElementsHost> & import("@open-wc/scoped-elements/types.js").ScopedElementsHostConstructor;
export default class OscdRemovalConfirmation extends OscdRemovalConfirmation_base {
    static scopedElements: {
        'oscd-dialog': typeof OscdDialog;
        'oscd-filled-button': typeof OscdFilledButton;
        'oscd-icon': typeof OscdIcon;
        'oscd-text-button': typeof OscdTextButton;
    };
    summary: RemovalSummary | null;
    private dialogUI;
    get open(): boolean;
    show(): Promise<void>;
    close(): Promise<void>;
    private handleConfirm;
    render(): import("lit-html").TemplateResult<1>;
    static styles: import("lit").CSSResult;
}
