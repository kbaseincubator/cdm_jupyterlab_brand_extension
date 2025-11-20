import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { startTokenExpirationMonitor } from './tokenExpiration';

/**
 * Initialization data for the cdm_jupyterlab_brand_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'cdm_jupyterlab_brand_extension:plugin',
  description: 'Custom branding extension for JupyterLab with token expiration warnings',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension cdm_jupyterlab_brand_extension is activated!');

    // Start monitoring token expiration
    startTokenExpirationMonitor();
  }
};

export default plugin;
