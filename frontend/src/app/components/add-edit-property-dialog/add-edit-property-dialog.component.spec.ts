import { Setup } from 'test/test-helper';

import { AddEditPropertyDialogComponent } from './add-edit-property-dialog.component';

describe('AddEditPropertyDialogComponent', () => {

  const ctx = Setup(AddEditPropertyDialogComponent);

  it('should create AddEditPropertyDialogComponent', () => {
    expect(ctx().component).toBeTruthy();
  });
});
