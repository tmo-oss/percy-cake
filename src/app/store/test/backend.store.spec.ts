import * as _ from 'lodash';
import * as HttpErrors from 'http-errors';

import { Principal } from 'models/auth';
import { ConfigFile, Configuration } from 'models/config-file';
import { FileManagementService } from 'services/file-management.service';
import { AlertDialogComponent } from 'components/alert-dialog/alert-dialog.component';
import { ConflictDialogComponent } from 'components/conflict-dialog/conflict-dialog.component';

import { StoreTestComponent, Setup, TestContext, TestUser, assertDialogOpened } from 'test/test-helper';

import * as AuthActions from '../actions/auth.actions';
import * as BackendActions from '../actions/backend.actions';
import * as reducer from '../reducers/backend.reducers';

const file1: ConfigFile = {
  fileName: 'test1.yaml',
  applicationName: 'app1',
  modified: true
};

const file2: ConfigFile = {
  fileName: 'test2.yaml',
  applicationName: 'app1',
  oid: '222222',
  modified: false
};

const file3: ConfigFile = {
  fileName: 'test3.yaml',
  applicationName: 'app1',
  oid: '333333',
  modified: true
};

describe('Backend store action/effect/reducer', () => {
  let ctx: TestContext<StoreTestComponent>;
  let fileService: FileManagementService;

  const setup = Setup(StoreTestComponent);

  let getFilesSpy: jasmine.Spy;

  beforeEach(() => {
    ctx = setup();
    fileService = ctx.resolve(FileManagementService);
    getFilesSpy = spyOn(fileService, 'getFiles');
    getFilesSpy.and.returnValue({
      files: [],
      applications: []
    });
  });

  it('Initialize action should be successful', () => {

    ctx.store.dispatch(new BackendActions.Initialize({ redirectUrl: '/redirect-to' }));

    expect(ctx.backendState().redirectUrl).toEqual('/redirect-to');

    expect(ctx.routerStub.value).toEqual(['/init']);
  });

  it('Initialized action should be successful', async () => {

    getFilesSpy.and.returnValue({
      files: [file1],
      applications: ['app1', 'app2']
    });

    const principal: Principal = {
      user: TestUser,
      repoMetadata: <any>{}
    };
    ctx.store.dispatch(new BackendActions.Initialized({ principal }));

    await ctx.fixture.whenStable();

    expect(ctx.routerStub.value).toEqual(['/dashboard']);

    expect(reducer.getPrincipal(ctx.backendState())).toEqual(principal);

    // Initialized action should trigger load files
    expect(reducer.getAllFiles(ctx.backendState())).toEqual({
      'app1': [file1],
      'app2': []
    });
    expect(reducer.getApplications(ctx.backendState())).toEqual(['app1', 'app2']);
    expect(reducer.GetConfigFile(ctx.backendState(), file1.fileName, file1.applicationName)).toEqual(file1);
    expect(reducer.GetConfigFile(ctx.backendState(), file2.fileName, file2.applicationName)).toBeUndefined();
  });

  it('LoadFiles action should be successful', async () => {

    // Get one file
    getFilesSpy.and.returnValue({
      files: [file1],
      applications: ['app1']
    });

    ctx.store.dispatch(new BackendActions.LoadFiles());
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.entities).toEqual({ 'app1/test1.yaml': file1 });

    // Get two files
    getFilesSpy.and.returnValue({
      files: [file1, file2],
      applications: ['app1']
    });

    ctx.store.dispatch(new BackendActions.LoadFiles());
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.entities).toEqual({
      'app1/test1.yaml': file1,
      'app1/test2.yaml': file2
    });

    // Get three files
    getFilesSpy.and.returnValue({
      files: [file1, file2, file3],
      applications: ['app1']
    });

    ctx.store.dispatch(new BackendActions.LoadFiles());
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.entities).toEqual({
      'app1/test1.yaml': file1,
      'app1/test2.yaml': file2,
      'app1/test3.yaml': file3
    });

    // Change oids
    getFilesSpy.and.returnValue({
      files: [{ ...file1, oid: '111111' }, { ...file2, oid: undefined }, { ...file3, oid: 'newoid' }],
      applications: ['app1']
    });

    ctx.store.dispatch(new BackendActions.LoadFiles());
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.entities['app1/test1.yaml'].oid).toEqual('111111');
    expect(ctx.backendState().files.entities['app1/test2.yaml'].oid).toBeUndefined();
    expect(ctx.backendState().files.entities['app1/test3.yaml'].oid).toEqual('newoid');
    _.each(ctx.backendState().files.entities, file => {
      expect(file.draftConfig).toBeUndefined();
      expect(file.originalConfig).toBeUndefined();
    });

    // Some file removed
    getFilesSpy.and.returnValue({
      files: [file2, file3],
      applications: ['app1']
    });

    ctx.store.dispatch(new BackendActions.LoadFiles());
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.entities).toEqual({
      'app1/test2.yaml': file2,
      'app1/test3.yaml': file3,
    });
  });

  it('LoadFiles action fail, alert dialog should show', async () => {
    getFilesSpy.and.throwError('Mock error');

    ctx.store.dispatch(new BackendActions.LoadFiles());
    await ctx.fixture.whenStable();
    assertDialogOpened(AlertDialogComponent, {
      data: {
        message: 'Mock error',
        alertType: 'error'
      }
    });
  });

  it('GetFileContent action should be successful', async () => {
    // Load files at first
    getFilesSpy.and.returnValue({
      files: [file1, file2],
      applications: ['app1']
    });

    ctx.store.dispatch(new BackendActions.LoadFiles());
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.entities).toEqual({
      'app1/test1.yaml': file1,
      'app1/test2.yaml': file2
    });

    const getFileContentSpy = spyOn(fileService, 'getFileContent');

    // Get one file content
    getFileContentSpy.and.returnValue({
      fileName: 'test1.yaml',
      applicationName: 'app1',
      draftConfig: new Configuration(),
    });

    ctx.store.dispatch(new BackendActions.GetFileContent({ fileName: 'test1.yaml', applicationName: 'app1' }));
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.entities['app1/test1.yaml']).toEqual({ ...file1, draftConfig: new Configuration() });

    // Get second file content
    getFileContentSpy.and.returnValue({
      fileName: 'test2.yaml',
      applicationName: 'app1',
      oid: '222222',
      originalConfig: new Configuration()
    });

    ctx.store.dispatch(new BackendActions.GetFileContent({ fileName: 'test2.yaml', applicationName: 'app1' }));
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.entities['app1/test2.yaml']).toEqual({ ...file2, originalConfig: new Configuration() });
  });

  it('GetFileContentSuccess action should not insert for newly created file', async () => {

    ctx.store.dispatch(new BackendActions.GetFileContentSuccess({ file: file1, newlyCreated: true }));
    await ctx.fixture.whenStable();

    expect(ctx.backendState().files.ids.length).toEqual(0);
  });

  it('GetFileContent action fail, alert dialog should show', async () => {
    spyOn(fileService, 'getFileContent').and.throwError('Mock error');

    ctx.store.dispatch(new BackendActions.GetFileContent(file1));
    await ctx.fixture.whenStable();
    assertDialogOpened(AlertDialogComponent, {
      data: {
        message: 'Mock error',
        alertType: 'error'
      }
    });
  });

  it('SaveDraft action should be successful', async () => {
    spyOn(fileService, 'saveDraft').and.returnValue(file1);

    ctx.store.dispatch(new BackendActions.SaveDraft({ file: file1, redirect: true }));
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.entities['app1/test1.yaml']).toEqual(file1);

    expect(ctx.routerStub.value).toEqual(['/dashboard']);
  });

  it('SaveDraft action should be successful without redirect', async () => {
    spyOn(fileService, 'saveDraft').and.returnValue(file1);

    ctx.store.dispatch(new BackendActions.SaveDraft({ file: file1, redirect: false }));
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.entities['app1/test1.yaml']).toEqual(file1);

    expect(ctx.routerStub.value).toBeUndefined();
  });

  it('SaveDraft action fail, alert dialog should show', async () => {

    spyOn(fileService, 'saveDraft').and.throwError('Mock error');

    ctx.store.dispatch(new BackendActions.SaveDraft({ file: file1, redirect: true }));
    await ctx.fixture.whenStable();
    assertDialogOpened(AlertDialogComponent, {
      data: {
        message: 'Mock error',
        alertType: 'error'
      }
    });
  });

  it('CommitChanges action should be successful', async () => {
    spyOn(fileService, 'commitFiles').and.returnValue([file1]);
    getFilesSpy.and.returnValue({ files: [file1, file2], applications: ['app1'] });

    ctx.store.dispatch(new BackendActions.CommitChanges({ files: [], message: 'test commit', fromEditor: true }));
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.ids.length).toEqual(1);
    expect(ctx.backendState().files.entities).toEqual({ 'app1/test1.yaml': file1 });
    expect(ctx.routerStub.value).toEqual(['/dashboard']);

    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.ids.length).toEqual(2);
  });

  it('CommitChanges action should be successful to resovel conflicts', async () => {
    getFilesSpy.and.returnValue({ files: [file1, file2], applications: ['app1'] });

    spyOn(fileService, 'commitFiles').and.callFake(() => {
      const error = new HttpErrors.Conflict('conflict error');
      error.data = [file1];
      throw error;
    });

    spyOn(fileService, 'resovelConflicts').and.returnValue([file1, file2]);

    ctx.store.dispatch(new BackendActions.CommitChanges({ files: [file1, file2], message: 'test commit', fromEditor: false }));
    await ctx.fixture.whenStable();

    assertDialogOpened(ConflictDialogComponent, {
      data: {
        conflictFiles: [file1],
      }
    });

    ctx.dialogStub.output.next([file1]);
    await ctx.fixture.whenStable();

    expect(ctx.backendState().files.ids.length).toEqual(2);
    expect(ctx.routerStub.value).toBeUndefined();
  });

  it('CommitChanges action fail, alert dialog should show', async () => {

    spyOn(fileService, 'commitFiles').and.throwError('Mock error');

    ctx.store.dispatch(new BackendActions.CommitChanges({ files: [], message: 'test commit', fromEditor: true }));
    await ctx.fixture.whenStable();

    assertDialogOpened(AlertDialogComponent, {
      data: {
        message: 'Mock error',
        alertType: 'error'
      }
    });
  });

  it('DeleteFile action should be successful', async () => {
    spyOn(fileService, 'deleteFile').and.returnValue(true);
    getFilesSpy.and.returnValue({ files: [file2], applications: ['app1'] });

    ctx.store.dispatch(new BackendActions.GetFileContentSuccess({ file: file1 }));
    expect(ctx.backendState().files.ids.length).toEqual(1);

    ctx.store.dispatch(new BackendActions.DeleteFile(file1));
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.ids.length).toEqual(0);

    assertDialogOpened(AlertDialogComponent, {
      data: {
        message: `${file1.applicationName}/${file1.fileName} is deleted successfully.`,
        alertType: 'delete'
      }
    });

    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.ids.length).toEqual(1);
  });

  it('DeleteFile action should be successful without pull', async () => {
    spyOn(fileService, 'deleteFile').and.returnValue(false);
    getFilesSpy.and.throwError('should not call me');

    ctx.store.dispatch(new BackendActions.GetFileContentSuccess({ file: file1 }));
    expect(ctx.backendState().files.ids.length).toEqual(1);

    ctx.store.dispatch(new BackendActions.DeleteFile(file1));
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.ids.length).toEqual(0);

    assertDialogOpened(AlertDialogComponent, {
      data: {
        message: `${file1.applicationName}/${file1.fileName} is deleted successfully.`,
        alertType: 'delete'
      }
    });

    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.ids.length).toEqual(0);
  });

  it('DeleteFile action fail, alert dialog should show', async () => {

    spyOn(fileService, 'deleteFile').and.throwError('Mock error');
    getFilesSpy.and.returnValue({ files: [file1, file2], applications: ['app1'] });

    ctx.store.dispatch(new BackendActions.GetFileContentSuccess({ file: file1 }));

    ctx.store.dispatch(new BackendActions.DeleteFile(file1));
    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.ids.length).toEqual(1);

    assertDialogOpened(AlertDialogComponent, {
      data: {
        message: 'Mock error',
        alertType: 'error'
      }
    });

    await ctx.fixture.whenStable();
    expect(ctx.backendState().files.ids.length).toEqual(2);
  });

  it('Refresh action should be successful', async () => {
    spyOn(fileService, 'refresh').and.returnValue({ branchChanged: true });
    getFilesSpy.and.returnValue({ files: [file1, file2], applications: ['app1'] });

    ctx.store.dispatch(new BackendActions.Refresh());
    expect(ctx.dashboarState().refreshing).toBeTruthy();

    await ctx.fixture.whenStable();

    expect(ctx.backendState().files.ids.length).toEqual(0);
    expect(ctx.dashboarState().refreshing).toBeFalsy();

    await ctx.fixture.whenStable();

    expect(ctx.backendState().files.ids.length).toEqual(2);
  });

  it('Refresh action should be successful without change', async () => {
    spyOn(fileService, 'refresh').and.returnValue({ branchChanged: false });
    getFilesSpy.and.returnValue({ files: [file1, file2], applications: ['app1'] });

    ctx.store.dispatch(new BackendActions.Refresh());
    expect(ctx.dashboarState().refreshing).toBeTruthy();

    await ctx.fixture.whenStable();

    expect(ctx.backendState().files.ids.length).toEqual(0);
    expect(ctx.dashboarState().refreshing).toBeFalsy();

    await ctx.fixture.whenStable();

    expect(ctx.backendState().files.ids.length).toEqual(0);
  });

  it('Refresh action fail, alert dialog should show', async () => {
    spyOn(fileService, 'refresh').and.throwError('Mock error');

    ctx.store.dispatch(new BackendActions.Refresh());
    expect(ctx.dashboarState().refreshing).toBeTruthy();

    await ctx.fixture.whenStable();

    expect(ctx.dashboarState().refreshing).toBeFalsy();

    assertDialogOpened(AlertDialogComponent, {
      data: {
        message: 'Mock error',
        alertType: 'error'
      }
    });
  });

  it('Checkout action should be successful', async () => {
    spyOn(fileService, 'checkoutBranch').and.callFake(() => { });
    getFilesSpy.and.returnValues(
      { files: [], applications: [] },
      { files: [file1, file2], applications: ['app1'] });

    ctx.store.dispatch(new AuthActions.LoginSuccess(TestUser));

    const principal: Principal = {
      user: { ...TestUser },
      repoMetadata: { ...TestUser, version: '1.0', commitBaseSHA: {} }
    };
    ctx.store.dispatch(new BackendActions.Initialized({ principal }));

    await ctx.fixture.whenStable();

    expect(ctx.backendState().files.ids.length).toEqual(0);

    ctx.store.dispatch(new BackendActions.Checkout({ type: 'create', branch: 'some-branch' }));
    expect(ctx.dashboarState().refreshing).toBeTruthy();

    await ctx.fixture.whenStable();

    expect(ctx.dashboarState().refreshing).toBeFalsy();
    expect(ctx.backendState().principal.user.branchName).toEqual('some-branch');
    expect(ctx.backendState().principal.repoMetadata.branchName).toEqual('some-branch');
    expect(ctx.authState().currentUser.branchName).toEqual('some-branch');

    await ctx.fixture.whenStable();

    expect(ctx.backendState().files.ids.length).toEqual(2);
  });

  it('Checkout action fail, alert dialog should show', async () => {
    spyOn(fileService, 'checkoutBranch').and.throwError('Mock error');

    ctx.store.dispatch(new BackendActions.Checkout({ type: 'create', branch: 'some-branch' }));
    expect(ctx.dashboarState().refreshing).toBeTruthy();

    await ctx.fixture.whenStable();

    expect(ctx.dashboarState().refreshing).toBeFalsy();

    assertDialogOpened(AlertDialogComponent, {
      data: {
        message: 'Mock error',
        alertType: 'error'
      }
    });
  });

  it('Merge branch action should be successful', async () => {
    const mergeBranchSpy = spyOn(fileService, 'mergeBranch');

    getFilesSpy.and.returnValue(
      { files: [file1, file2], applications: ['app1'] });

    ctx.store.dispatch(new BackendActions.MergeBranch(
      { srcBranch: 'master', targetBranch: 'some-branch', diff: { toSave: [file1], toDelete: [] } }));
    expect(ctx.dashboarState().committingFile).toBeTruthy();

    await ctx.fixture.whenStable();

    expect(mergeBranchSpy.calls.count()).toEqual(1);
    expect(ctx.dashboarState().committingFile).toBeFalsy();

    await ctx.fixture.whenStable();

    expect(ctx.backendState().files.ids.length).toEqual(2);
  });

  it('Merge branch action should be successful without diff', async () => {
    const mergeBranchSpy = spyOn(fileService, 'mergeBranch');
    spyOn(fileService, 'refresh').and.callFake(() => { });
    spyOn(fileService, 'branchDiff').and.callFake(() => {
      return { toSave: [], toDelete: [], conflictFiles: [] };
    });

    getFilesSpy.and.returnValue(
      { files: [file1, file2], applications: ['app1'] });

    ctx.store.dispatch(new BackendActions.MergeBranch({ srcBranch: 'master', targetBranch: 'some-branch' }));
    expect(ctx.dashboarState().committingFile).toBeTruthy();

    await ctx.fixture.whenStable();
    await ctx.fixture.whenStable();

    expect(mergeBranchSpy.calls.count()).toEqual(0);
    expect(ctx.dashboarState().committingFile).toBeFalsy();

    await ctx.fixture.whenStable();

    expect(ctx.backendState().files.ids.length).toEqual(2);
  });

  it('Merge branch action should resolve conflicts successfully', async () => {
    const mergeBranchSpy = spyOn(fileService, 'mergeBranch');
    spyOn(fileService, 'refresh').and.callFake(() => { });
    spyOn(fileService, 'branchDiff').and.callFake(() => {
      return { toSave: [file1], toDelete: [], conflictFiles: [file2] };
    });

    getFilesSpy.and.returnValue(
      { files: [file1, file2], applications: ['app1'] });

    ctx.store.dispatch(new BackendActions.MergeBranch({ srcBranch: 'master', targetBranch: 'some-branch' }));
    await ctx.fixture.whenStable();
    await ctx.fixture.whenStable();

    assertDialogOpened(ConflictDialogComponent, {
      data: {
        diff: { toSave: [file1], toDelete: [] },
        conflictFiles: [file2],
        srcBranch: 'master',
        targetBranch: 'some-branch'
      }
    });

    ctx.dialogStub.output.next([file2]);
    await ctx.fixture.whenStable();

    expect(mergeBranchSpy.calls.count()).toEqual(1);
    expect(ctx.backendState().files.ids.length).toEqual(2);
  });

  it('Merge branch fail, alert dialog should show', async () => {
    const mergeBranchSpy = spyOn(fileService, 'mergeBranch');
    mergeBranchSpy.and.throwError('Mock merge error');

    ctx.store.dispatch(new BackendActions.MergeBranch(
      { srcBranch: 'master', targetBranch: 'some-branch', diff: { toSave: [file1], toDelete: [] } }));
    expect(ctx.dashboarState().committingFile).toBeTruthy();

    await ctx.fixture.whenStable();

    expect(mergeBranchSpy.calls.count()).toEqual(1);
    expect(ctx.dashboarState().committingFile).toBeFalsy();

    assertDialogOpened(AlertDialogComponent, {
      data: {
        message: 'Mock merge error',
        alertType: 'error'
      }
    });
  });
});
