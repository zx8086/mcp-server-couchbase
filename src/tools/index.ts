/* src/tools/index.ts */

import getScopesAndCollections from './getScopesAndCollections';
import getSchemaForCollection from './getSchemaForCollection';
import documentOperations, { 
    getDocumentByIdHandler,
    upsertDocumentByIdHandler,
    deleteDocumentByIdHandler
} from './documentOperations';
import runSqlPlusPlusQuery from './runSqlPlusPlusQuery';

export {
    getDocumentByIdHandler,
    upsertDocumentByIdHandler,
    deleteDocumentByIdHandler
};

export default [
    getScopesAndCollections,
    getSchemaForCollection,
    documentOperations,
    runSqlPlusPlusQuery
];