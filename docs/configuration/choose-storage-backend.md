## Select and Setup Storage Backend

*Last Updated: 2026-01-09*

OpenContracts supports three storage backends: **Local filesystem**, **Amazon S3 (AWS)**, and **Google Cloud Storage (GCP)**. You select the backend using the `STORAGE_BACKEND` environment variable.

**Reference**: See [config/settings/base.py](../../config/settings/base.py) (lines 32-446) for the complete storage backend configuration.

## Storage Backend Selection

Set the `STORAGE_BACKEND` environment variable in your `.django` env file:

| Value | Description |
|-------|-------------|
| `LOCAL` | Uses local filesystem via Docker volume (default) |
| `AWS` | Uses Amazon S3 for file storage |
| `GCP` | Uses Google Cloud Storage for file storage |

**Note**: The legacy `USE_AWS` environment variable is deprecated. If set, a deprecation warning will be shown and `USE_AWS=true` will be treated as `STORAGE_BACKEND=AWS`.

## Local Storage Backend

Setting `STORAGE_BACKEND=LOCAL` (or omitting the variable entirely) uses the disk space in the Django container. When using the local Docker Compose stack, the Celery workers and Django containers share the same disk, so this works fine.

**Important**: The production configuration would not work properly with `STORAGE_BACKEND=LOCAL`, as each container has its own disk.

## AWS S3 Storage Backend

If you want to use AWS S3 to store files (primarily PDFs, but also exports, tokens, and text files), you will need an Amazon AWS account to set up S3. There are a number of [tutorials](https://simpleisbetterthancomplex.com/tutorial/2017/08/01/how-to-setup-amazon-s3-in-a-django-project.html) and [guides](https://testdriven.io/blog/storing-django-static-and-media-files-on-amazon-s3/) for configuring AWS with a Django project.

Once you have an S3 bucket configured, set the following environment variables in your `.django` file (in `.envs/.production` or `.envs/.local`, depending on your target environment):

### Required AWS Variables

| Variable | Description |
|----------|-------------|
| `STORAGE_BACKEND` | Set to `AWS` |
| `AWS_ACCESS_KEY_ID` | Access key ID from your IAM user |
| `AWS_SECRET_ACCESS_KEY` | Secret access key from your IAM user |
| `AWS_STORAGE_BUCKET_NAME` | Name of your S3 bucket |
| `AWS_S3_REGION_NAME` | AWS region of your bucket (e.g., `us-east-1`) |

### Optional AWS Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_S3_CUSTOM_DOMAIN` | None | Custom domain for S3 (e.g., CloudFront) |
| `AWS_S3_CONNECTION_POOL_SIZE` | `10` | Connection pool size for better performance |
| `S3_PREFIX` | `documents` | Prefix path for documents in the bucket |
| `S3_DOCUMENT_PATH` | `open_contracts` | Path for document storage |

## GCP Cloud Storage Backend

If you want to use Google Cloud Storage, you will need a Google Cloud account with a storage bucket configured.

Set the following environment variables in your `.django` file:

### Required GCP Variables

| Variable | Description |
|----------|-------------|
| `STORAGE_BACKEND` | Set to `GCP` |
| `GS_BUCKET_NAME` | Name of your GCS bucket |

### Optional GCP Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GS_PROJECT_ID` | None | Your Google Cloud project ID |
| `GS_CREDENTIALS` | None | Path to service account JSON or uses default credentials |
| `GS_DEFAULT_ACL` | None | ACL for new files |
| `GS_QUERYSTRING_AUTH` | `true` | Use signed URLs for security |
| `GS_EXPIRATION_SECONDS` | `86400` | Signed URL expiration (24 hours) |
| `GS_FILE_OVERWRITE` | `false` | Whether to overwrite existing files |
| `GS_MAX_MEMORY_SIZE` | `0` | Max memory before disk rollover |
| `GS_BLOB_CHUNK_SIZE` | `2621440` | Chunk size for resumable uploads (2.5MB) |
| `GS_CUSTOM_ENDPOINT` | None | Custom endpoint URL |
| `GS_LOCATION` | `` | Subdirectory prefix for files |
| `GS_IS_GZIPPED` | `false` | Enable GZIP compression |
| `GS_IAM_SIGN_BLOB` | `false` | Use IAM Sign Blob API for signed URLs |
| `GS_SA_EMAIL` | None | Service account email for signing |
| `GCS_DOCUMENT_PATH` | `open_contracts` | Path for document storage |

### GCP Authentication Options

1. **Service Account Key File**: Set `GS_CREDENTIALS` to the path of your service account JSON file
2. **Workload Identity**: For GKE deployments, attach a service account to your compute instance (recommended for production)
3. **Default Credentials**: If running on GCP infrastructure, application default credentials are used automatically
