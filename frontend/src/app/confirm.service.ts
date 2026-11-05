import { Component, inject, Injectable, Input } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  standalone: true,
  template: `<div class="modal-header">
      <h2 class="modal-title fs-5" id="confirm-title">{{ title }}</h2>
      <button type="button" class="btn-close" aria-label="Close" (click)="modal.dismiss()"></button>
    </div>
    <div class="modal-body" id="confirm-description">{{ message }}</div>
    <div class="modal-footer">
      <button class="btn btn-outline-secondary" (click)="modal.dismiss()">Cancel</button
      ><button [class]="danger ? 'btn btn-danger' : 'btn btn-primary'" (click)="modal.close(true)">
        {{ action }}
      </button>
    </div>`,
})
export class ConfirmDialog {
  modal = inject(NgbActiveModal);
  @Input() title = 'Confirm';
  @Input() message = '';
  @Input() action = 'Confirm';
  @Input() danger = true;
}
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private modal = inject(NgbModal);
  async ask(title: string, message: string, action = 'Delete', danger = true): Promise<boolean> {
    const ref = this.modal.open(ConfirmDialog, {
      centered: true,
      ariaLabelledBy: 'confirm-title',
      ariaDescribedBy: 'confirm-description',
    });
    Object.assign(ref.componentInstance, { title, message, action, danger });
    try {
      return (await ref.result) === true;
    } catch {
      return false;
    }
  }
}
