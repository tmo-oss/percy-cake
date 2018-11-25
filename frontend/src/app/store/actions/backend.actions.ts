import { Action } from '@ngrx/store';

import { ConfigFile } from '../../models/config-file';
import { HttpErrorResponse } from '@angular/common/http';

export enum BackendActionTypes {
  Initialized = '[Backend] Initialized',
  ListApplications = '[Backend] List Applications',
  ListApplicationsSuccess = '[Backend] List Applications Success',
  ListApplicationsFailure = '[Backend] List Applications Failure',
  LoadFiles = '[Backend] Load Files',
  LoadFilesSuccess = '[Backend] Load Files Success',
  LoadFilesFailure = '[Backend] Load Files Failure',
  GetFileContent = '[Backend] Get File Content',
  GetFileContentSuccess = '[Backend] Get File Content Success',
  GetFileContentFailure = '[Backend] Get File Content Failure',
  DeleteFile = '[Backend] Delete File',
  DeleteFileFailure = '[Backend] Delete File Failure',
  DeleteFileSuccess = '[Backend] Delete File Success',
  SaveDraft = '[Backend] Save Draft',
  CommitChanges = '[Backend] Commit Changes',
  CommitChangesSuccess = '[Backend] Commit Changes Success',
  CommitChangesFailure = '[Backend] Commit Changes Failure',
  ResolveConficts = '[Backend] Resolve Conflicts',
}

export class Initialized implements Action {
  readonly type = BackendActionTypes.Initialized;
}

export class LoadFiles implements Action {
  readonly type = BackendActionTypes.LoadFiles;
}

export class LoadFilesSuccess implements Action {
  readonly type = BackendActionTypes.LoadFilesSuccess;

  constructor(public payload: {files: ConfigFile[], applications: string[]}) { }
}

export class LoadFilesFailure implements Action {
  readonly type = BackendActionTypes.LoadFilesFailure;

  constructor(public payload: HttpErrorResponse) { }
}

export class GetFileContent implements Action {
    readonly type = BackendActionTypes.GetFileContent;
    constructor(public payload: ConfigFile) { }
}

export class GetFileContentSuccess implements Action {
    readonly type = BackendActionTypes.GetFileContentSuccess;
    constructor(public payload: ConfigFile) { }
}

export class GetFileContentFailure implements Action {
    readonly type = BackendActionTypes.GetFileContentFailure;
    constructor(public payload: HttpErrorResponse) { }
}

export class DeleteFile implements Action {
  readonly type = BackendActionTypes.DeleteFile;

  constructor(public payload: ConfigFile) { }
}

export class DeleteFileSuccess implements Action {
  readonly type = BackendActionTypes.DeleteFileSuccess;
  constructor(public payload: ConfigFile) { }
}

export class DeleteFileFailure implements Action {
  readonly type = BackendActionTypes.DeleteFileFailure;

  constructor(public payload: HttpErrorResponse) { }
}

export class SaveDraft implements Action {
  readonly type = BackendActionTypes.SaveDraft;

  constructor(public payload: {file: ConfigFile, redirect: boolean}) { }
}

export class CommitChanges implements Action {
  readonly type = BackendActionTypes.CommitChanges;

  constructor(public payload: {files: ConfigFile[], message: string, fromEditor?: boolean}) { }
}

export class CommitChangesSuccess implements Action {
  readonly type = BackendActionTypes.CommitChangesSuccess;

  constructor(public payload: {files: ConfigFile[], fromEditor?: boolean}) { }
}

export class CommitChangesFailure implements Action {
  readonly type = BackendActionTypes.CommitChangesFailure;

  constructor(public payload: {error: HttpErrorResponse, files: ConfigFile[], commitMessage: string, fromEditor?: boolean}) { }
}

export class ResolveConficts implements Action {
  readonly type = BackendActionTypes.ResolveConficts;

  constructor(public payload: ConfigFile[]) { }
}


export type BackendActionsUnion =
  | Initialized
  | LoadFiles
  | LoadFilesSuccess
  | LoadFilesFailure
  | GetFileContent
  | GetFileContentSuccess
  | GetFileContentFailure
  | DeleteFile
  | DeleteFileSuccess
  | DeleteFileFailure
  | SaveDraft
  | CommitChanges
  | CommitChangesSuccess
  | CommitChangesFailure
  | ResolveConficts
  ;
