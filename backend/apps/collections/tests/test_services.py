import pytest

from apps.accounts.models import User
from apps.collections.models import Collection
from apps.collections.services import get_descendant_ids

pytestmark = pytest.mark.django_db


def create_user(email="user@example.com", password="StrongPass123"):
    return User.objects.create_user(email=email, password=password)


def create_collection(owner, name="Root", parent=None):
    return Collection.objects.create(owner=owner, name=name, parent=parent)


class TestGetDescendantIds:
    def test_collection_with_no_children_has_no_descendants(self):
        user = create_user()
        leaf = create_collection(user, name="Leaf")

        assert get_descendant_ids(leaf) == set()

    def test_direct_children_are_descendants(self):
        user = create_user()
        parent = create_collection(user, name="Parent")
        child_a = create_collection(user, name="A", parent=parent)
        child_b = create_collection(user, name="B", parent=parent)

        assert get_descendant_ids(parent) == {child_a.id, child_b.id}

    def test_multi_level_descendants_are_all_included(self):
        user = create_user()
        grandparent = create_collection(user, name="Grandparent")
        parent = create_collection(user, name="Parent", parent=grandparent)
        child = create_collection(user, name="Child", parent=parent)
        grandchild = create_collection(user, name="Grandchild", parent=child)

        assert get_descendant_ids(grandparent) == {parent.id, child.id, grandchild.id}
        # A narrower branch only sees its own subtree.
        assert get_descendant_ids(parent) == {child.id, grandchild.id}

    def test_sibling_subtrees_are_isolated(self):
        user = create_user()
        root = create_collection(user, name="Root")
        branch_a = create_collection(user, name="A", parent=root)
        branch_a_child = create_collection(user, name="A-child", parent=branch_a)
        branch_b = create_collection(user, name="B", parent=root)

        assert get_descendant_ids(branch_a) == {branch_a_child.id}
        assert get_descendant_ids(branch_b) == set()
        assert get_descendant_ids(root) == {branch_a.id, branch_a_child.id, branch_b.id}
