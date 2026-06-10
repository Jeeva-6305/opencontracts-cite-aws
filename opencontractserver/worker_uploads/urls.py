from django.urls import path

from opencontractserver.worker_uploads.views import (
    WorkerDocumentUploadListView,
    WorkerDocumentUploadStatusView,
    WorkerDocumentUploadView,
)

app_name = "worker_uploads"

# IMPORTANT: "documents/list/" must precede "documents/<uuid:upload_id>/"
# because Django resolves URLs top-down and would otherwise try to parse
# the literal string "list" as a UUID.
urlpatterns = [
    path(
        "documents/",
        WorkerDocumentUploadView.as_view(),
        name="upload",
    ),
    path(
        "documents/list/",
        WorkerDocumentUploadListView.as_view(),
        name="list",
    ),
    path(
        "documents/<uuid:upload_id>/",
        WorkerDocumentUploadStatusView.as_view(),
        name="status",
    ),
]
