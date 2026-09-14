from .models import Collection


def get_descendant_ids(collection):
    """
    All ids reachable by following `children` from `collection`, however
    deep. Used to stop a collection being reparented into one of its own
    subfolders, which would otherwise create a cycle.
    """
    descendant_ids = set()
    frontier = [collection.id]
    while frontier:
        children_ids = list(Collection.objects.filter(parent_id__in=frontier).values_list("id", flat=True))
        frontier = [cid for cid in children_ids if cid not in descendant_ids]
        descendant_ids.update(frontier)
    return descendant_ids
