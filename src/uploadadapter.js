import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import FileRepository from '@ckeditor/ckeditor5-upload/src/filerepository';

export default class SeednetUploadAdapter extends Plugin {
    /**
     * @inheritDoc
     */
    static get requires() {
        return [ FileRepository ];
    }

    /**
     * @inheritDoc
     */
    static get pluginName() {
        return 'SeednetUploadAdapter';
    }

    /**
     * @inheritDoc
     */
    init() {
        const url = this.editor.config.get( 'upload.uploadUrl' );
        const token = this.editor.config.get( 'upload.token' );

        if ( !url ) {
            return;
        }

        // Register SeednetAdapter
        this.editor.plugins.get( FileRepository ).createUploadAdapter = loader => new UploadAdapter( loader, url, token, this.editor.t );
    }
}

/**
 * Upload adapter for Seednet.
 *
 * @private
 * @implements module:upload/filerepository~UploadAdapter
 */
class UploadAdapter {
    /**
     * Creates a new adapter instance.
     *
     * @param {module:upload/filerepository~FileLoader} loader
     * @param {String} url
     * @param {module:utils/locale~Locale#t} t
     */
    constructor( loader, url, token, t ) {
        /**
         * FileLoader instance to use during the upload.
         *
         * @member {module:upload/filerepository~FileLoader} #loader
         */
        this.loader = loader;

        /**
         * Upload URL.
         *
         * @member {String} #url
         */
        this.url = url;

        this.token = token

        /**
         * Locale translation method.
         *
         * @member {module:utils/locale~Locale#t} #t
         */
        this.t = t;
    }

    /**
     * Starts the upload process.
     *
     * @see module:upload/filerepository~UploadAdapter#upload
     * @returns {Promise}
     */
    upload() {
        return this.loader.file
            .then( file => new Promise( ( resolve, reject ) => {
                this._initRequest();
                this._initListeners( resolve, reject, file );
                this._sendRequest( file );
            } ) );
    }

    /**
     * Aborts the upload process.
     *
     * @see module:upload/filerepository~UploadAdapter#abort
     * @returns {Promise}
     */
    abort() {
        if ( this.xhr ) {
            this.xhr.abort();
        }
    }

    /**
     * Initializes the XMLHttpRequest object.
     *
     * @private
     */
    _initRequest() {
        const xhr = this.xhr = new XMLHttpRequest();

        xhr.open( 'POST', this.url, true );
        xhr.responseType = 'json';
    }

    /**
     * Initializes XMLHttpRequest listeners.
     *
     * @private
     * @param {Function} resolve Callback function to be called when the request is successful.
     * @param {Function} reject Callback function to be called when the request cannot be completed.
     */
    _initListeners( resolve, reject, file ) {
        const xhr = this.xhr;
        const loader = this.loader;
        const t = this.t;
        const genericError = t( 'Cannot upload file:' ) + ` ${ file.name }.`;

        xhr.addEventListener( 'error', () => reject( genericError ));
        xhr.addEventListener( 'abort', () => reject() );
        xhr.addEventListener( 'load', () => {
            const response = xhr.response;

            if ( !response || !response.url ) {
                return reject( response && response.error && response.error.message ? response.error.message : genericError );
            }

            resolve( {
                default: response.url
            } );
        } );

        // Upload progress when it's supported.
        /* istanbul ignore else */
        if ( xhr.upload ) {
            xhr.upload.addEventListener( 'progress', evt => {
                if ( evt.lengthComputable ) {
                    loader.uploadTotal = evt.total;
                    loader.uploaded = evt.loaded;
                }
            } );
        }
    }

    /**
     * Prepares the data and sends the request.
     *
     * @private
     */
    _sendRequest(file ) {
        // Prepare form data.
        const data = new FormData();
        data.append( 'upload', file );

        // this.xhr.setRequestHeader('Authorization', 'Bearer ' + this.token())

        // Send request.
        this.xhr.send( data );
    }
}