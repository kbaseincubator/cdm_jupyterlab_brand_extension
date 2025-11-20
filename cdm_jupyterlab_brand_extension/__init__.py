"""Custom branding extension for JupyterLab with token expiration warnings."""

try:
    from ._version import __version__
except ImportError:
    __version__ = "dev"


def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "cdm_jupyterlab_brand_extension"
    }]
