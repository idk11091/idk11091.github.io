import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import * as suitesApi from '../../api/suites';
import type { Project, Suite } from '../../api/types';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../../components/Button';
import { Field, Input, Label } from '../../components/Input';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ApiError } from '../../lib/apiClient';

type Context = { project: Project & { suites: Suite[] } };

export function ProjectCasesTab() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project } = useOutletContext<Context>();
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'LEAD';
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingSuiteId, setEditingSuiteId] = useState<string | null>(null);
  const [editingSuiteName, setEditingSuiteName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Suite | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const createSuite = useMutation({
    mutationFn: () => suitesApi.createSuite(projectId!, { name }),
    onSuccess: () => {
      setName('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to create suite'),
  });

  const updateSuite = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => suitesApi.updateSuite(id, { name }),
    onSuccess: () => {
      setEditingSuiteId(null);
      setEditingSuiteName('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to update suite'),
  });

  const deleteImpactQuery = useQuery({
    queryKey: ['suites', deleteTarget?.id, 'delete-impact'],
    queryFn: () => suitesApi.getSuiteDeleteImpact(deleteTarget!.id),
    enabled: !!deleteTarget,
  });

  const deleteSuite = useMutation({
    mutationFn: (id: string) => suitesApi.deleteSuite(id),
    onSuccess: () => {
      setDeleteTarget(null);
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
    onError: (err) => setDeleteError(err instanceof ApiError ? err.message : 'Failed to delete suite'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createSuite.mutate();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">Test Cases</h1>
      {canManage && (
        <form onSubmit={handleSubmit} className="mb-6 flex items-end gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex-1">
            <Field>
              <Label htmlFor="suite-name">New suite name</Label>
              <Input id="suite-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" disabled={createSuite.isPending} className="mb-3">
            {createSuite.isPending ? 'Creating…' : 'Add suite'}
          </Button>
        </form>
      )}
      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="space-y-2">
        {project.suites.map((suite) => (
          <div
            key={suite.id}
            className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:shadow-sm"
          >
            {editingSuiteId === suite.id ? (
              <form
                className="flex min-w-0 flex-1 items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  updateSuite.mutate({ id: suite.id, name: editingSuiteName.trim() });
                }}
              >
                <div className="min-w-0 flex-1">
                  <Field>
                    <Label htmlFor={`suite-name-${suite.id}`}>Suite name</Label>
                    <Input
                      id={`suite-name-${suite.id}`}
                      required
                      maxLength={200}
                      value={editingSuiteName}
                      onChange={(event) => setEditingSuiteName(event.target.value)}
                      autoFocus
                    />
                  </Field>
                </div>
                <Button type="submit" disabled={updateSuite.isPending || !editingSuiteName.trim()}>
                  {updateSuite.isPending ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingSuiteId(null);
                    setEditingSuiteName('');
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <Link to={`/suites/${suite.id}`} className="min-w-0 flex-1">
                <h3 className="font-medium text-slate-900 dark:text-slate-100">{suite.name}</h3>
                {suite.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{suite.description}</p>}
              </Link>
            )}
            {canManage && editingSuiteId !== suite.id && (
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingSuiteId(suite.id);
                    setEditingSuiteName(suite.name);
                    setError(null);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(suite);
                  }}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        ))}
        {project.suites.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No test suites yet.</p>}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => {
          if (deleteSuite.isPending) return;
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={() => deleteTarget && deleteSuite.mutate(deleteTarget.id)}
        title={`Delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete suite"
        confirming={deleteSuite.isPending}
        confirmDisabled={!deleteImpactQuery.data || deleteImpactQuery.isError || deleteImpactQuery.isFetching}
        message={
          deleteImpactQuery.isError ? (
            <p className="text-red-600 dark:text-red-400">Could not load the deletion details. Close this dialog and try again before deleting the suite.</p>
          ) : deleteImpactQuery.data ? (
            <div className="space-y-2">
              <p className="font-semibold text-red-700 dark:text-red-400">
                {deleteImpactQuery.data.caseCount > 0 ? (
                  <>Deleting this suite permanently deletes all <strong>{deleteImpactQuery.data.caseCount}</strong> connected test case{deleteImpactQuery.data.caseCount === 1 ? '' : 's'} and their sections. This cannot be undone.</>
                ) : (
                  'Deleting this suite permanently deletes the suite and its sections. This cannot be undone.'
                )}
              </p>
              {deleteImpactQuery.data.activeRunCount > 0 && (
                <p>It also deletes {deleteImpactQuery.data.activeRunCount} active test run(s) and their results.</p>
              )}
              {deleteImpactQuery.data.closedRunCount > 0 && (
                <p>{deleteImpactQuery.data.closedRunCount} closed run(s) will be preserved without a suite link.</p>
              )}
              {deleteError && <p className="text-red-600 dark:text-red-400">{deleteError}</p>}
            </div>
          ) : (
            'Loading deletion details…'
          )
        }
      />
    </div>
  );
}
