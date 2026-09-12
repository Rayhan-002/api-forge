'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection,
} from '@/lib/api/collections';
import { deleteSavedRequest, moveSavedRequest, updateSavedRequest } from '@/lib/api/saved-requests';
import type { Collection, SavedRequestListItem } from '@/types/collections';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CollectionFormDialog } from '@/components/collections/collection-form-dialog';
import { CollectionRow } from '@/components/collections/collection-row';
import { MoveRequestDialog } from '@/components/collections/move-request-dialog';
import { RenameRequestDialog } from '@/components/collections/rename-request-dialog';

type DialogState =
  | { type: 'none' }
  | { type: 'create-collection' }
  | { type: 'rename-collection'; collection: Collection }
  | { type: 'delete-collection'; collection: Collection }
  | { type: 'rename-request'; request: SavedRequestListItem }
  | { type: 'move-request'; request: SavedRequestListItem }
  | { type: 'delete-request'; request: SavedRequestListItem };

export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: listCollections });
  const collections = collectionsQuery.data?.results ?? [];

  function closeDialog() {
    setDialog({ type: 'none' });
  }

  function invalidateRequestsFor(collectionId: string) {
    queryClient.invalidateQueries({ queryKey: ['collections', collectionId, 'requests'] });
  }

  const createMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection created.');
      closeDialog();
    },
  });

  const renameCollectionMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateCollection(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection renamed.');
      closeDialog();
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection deleted.');
      closeDialog();
    },
  });

  const renameRequestMutation = useMutation({
    mutationFn: ({ id, name, collectionId }: { id: string; name: string; collectionId: string }) =>
      updateSavedRequest(id, { name }).then((r) => ({ r, collectionId })),
    onSuccess: ({ collectionId }) => {
      invalidateRequestsFor(collectionId);
      toast.success('Request renamed.');
      closeDialog();
    },
  });

  const moveRequestMutation = useMutation({
    mutationFn: ({ id, target }: { id: string; target: string; sourceCollectionId: string }) =>
      moveSavedRequest(id, target),
    onSuccess: (_data, variables) => {
      invalidateRequestsFor(variables.sourceCollectionId);
      invalidateRequestsFor(variables.target);
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Request moved.');
      closeDialog();
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: ({ id }: { id: string; collectionId: string }) => deleteSavedRequest(id),
    onSuccess: (_data, variables) => {
      invalidateRequestsFor(variables.collectionId);
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Request deleted.');
      closeDialog();
    },
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Collections</h1>
        <Button onClick={() => setDialog({ type: 'create-collection' })}>
          <FolderPlus className="h-4 w-4" />
          New Collection
        </Button>
      </div>

      {collectionsQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Loading collections…</p>
      )}

      {!collectionsQuery.isLoading && collections.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">You don&apos;t have any collections yet.</p>
          <Button variant="secondary" onClick={() => setDialog({ type: 'create-collection' })}>
            Create your first collection
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {collections.map((collection) => (
          <CollectionRow
            key={collection.id}
            collection={collection}
            onRenameCollection={(c) => setDialog({ type: 'rename-collection', collection: c })}
            onDeleteCollection={(c) => setDialog({ type: 'delete-collection', collection: c })}
            onRenameRequest={(r) => setDialog({ type: 'rename-request', request: r })}
            onMoveRequest={(r) => setDialog({ type: 'move-request', request: r })}
            onDeleteRequest={(r) => setDialog({ type: 'delete-request', request: r })}
          />
        ))}
      </div>

      <CollectionFormDialog
        open={dialog.type === 'create-collection'}
        onClose={closeDialog}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isLoading={createMutation.isPending}
        title="New collection"
        submitLabel="Create"
      />

      <CollectionFormDialog
        open={dialog.type === 'rename-collection'}
        onClose={closeDialog}
        onSubmit={(payload) => {
          if (dialog.type !== 'rename-collection') return;
          renameCollectionMutation.mutate({ id: dialog.collection.id, name: payload.name });
        }}
        isLoading={renameCollectionMutation.isPending}
        initial={
          dialog.type === 'rename-collection'
            ? { name: dialog.collection.name, description: dialog.collection.description }
            : undefined
        }
        title="Rename collection"
        submitLabel="Save"
      />

      <ConfirmDialog
        open={dialog.type === 'delete-collection'}
        onClose={closeDialog}
        onConfirm={() => {
          if (dialog.type !== 'delete-collection') return;
          deleteCollectionMutation.mutate(dialog.collection.id);
        }}
        isLoading={deleteCollectionMutation.isPending}
        title="Delete collection"
        message={
          dialog.type === 'delete-collection'
            ? `Delete "${dialog.collection.name}" and all ${dialog.collection.request_count} saved request(s) in it? This cannot be undone.`
            : ''
        }
      />

      <RenameRequestDialog
        open={dialog.type === 'rename-request'}
        onClose={closeDialog}
        onSubmit={(name) => {
          if (dialog.type !== 'rename-request') return;
          renameRequestMutation.mutate({
            id: dialog.request.id,
            name,
            collectionId: dialog.request.collection,
          });
        }}
        isLoading={renameRequestMutation.isPending}
        initialName={dialog.type === 'rename-request' ? dialog.request.name : ''}
      />

      <MoveRequestDialog
        open={dialog.type === 'move-request'}
        onClose={closeDialog}
        onSubmit={(target) => {
          if (dialog.type !== 'move-request') return;
          moveRequestMutation.mutate({
            id: dialog.request.id,
            target,
            sourceCollectionId: dialog.request.collection,
          });
        }}
        isLoading={moveRequestMutation.isPending}
        collections={collections}
        currentCollectionId={dialog.type === 'move-request' ? dialog.request.collection : ''}
      />

      <ConfirmDialog
        open={dialog.type === 'delete-request'}
        onClose={closeDialog}
        onConfirm={() => {
          if (dialog.type !== 'delete-request') return;
          deleteRequestMutation.mutate({
            id: dialog.request.id,
            collectionId: dialog.request.collection,
          });
        }}
        isLoading={deleteRequestMutation.isPending}
        title="Delete request"
        message={
          dialog.type === 'delete-request'
            ? `Delete "${dialog.request.name}"? This cannot be undone.`
            : ''
        }
      />
    </div>
  );
}
