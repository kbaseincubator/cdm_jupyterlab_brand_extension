# cdm_jupyterlab_brand_extension

Simple extension to apply custom brand logos JupyterLab.

Demo [JupyterLab site via JupyterLite](http://innovationoutside.github.io/jupyterlab_ou_brand_extension/)
Demo [RetroLab / notebook v.7 site via JupyterLite](http://innovationoutside.github.io/jupyterlab_ou_brand_extension/retro)

To install the prebuilt extension from a wheel:

`pip3 install --upgrade https://raw.githubusercontent.com/kbaseincubator/cdm_jupyterlab_brand_extension/blob/main/dist/cdm_jupyterlab_brand_extension-0.1.0-py3-none-any.whl`

Custom logos applied to:

- JupyterLab IDE
- RetroLab homepage
- RetroLab notebooks
- favicons

![](./images/branding_logos_jupyterlab.png)

About: [Custom Branded Logos for JupyterLab and RetroLab (Jupyter notebook v.7)](https://blog.ouseful.info/2022/04/29/custom-branded-logos-for-jupyterlab-and-retrolab-jupyter-notebook-v-7/)

## Customizing the Extension

For detailed instructions, please refer to [Custom Branded Logos for JupyterLab and RetroLab (Jupyter notebook v.7)](https://blog.ouseful.info/2022/04/29/custom-branded-logos-for-jupyterlab-and-retrolab-jupyter-notebook-v-7/).

### Customizing the Logos

To customize the logos, modify the [./style/base.css](./style/base.css) file to include your own JupyterLab logo image location. 
Place the new images in the [./style/images/](./style/images) folder.

### Customizing the Favicons

To customize the favicons, modify the `link.href` in the [./style/index.js](./style/index.js) file. The pre-built 
[extension](./dist/cdm_jupyterlab_brand_extension-0.1.0-py3-none-any.whl) is currently
using the [KBase favicon](https://www.kbase.us/wp-content/uploads/sites/6/2020/08/kbase-favicon-32-bgwhite_rounded_corners.png).

## Building and Pushing Newly Built Wheels to PyPi

```bash
# Build
pip install build

#Install the package
pip install .

# Node MUST BE INSTALLED
python -m build
# packages built into ./dist

# Push to PyPi
pip install twine
twine upload MY_PACKAGE.whl
```

