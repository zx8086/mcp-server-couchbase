/* src/tools/index.ts */

import getScopesAndCollections, { getScopesAndCollectionsHandler } from './getScopesAndCollections';
import getSchemaForCollection, { getSchemaForCollectionHandler } from './getSchemaForCollection';
import documentOperations, { 
    getDocumentByIdHandler,
    upsertDocumentByIdHandler,
    deleteDocumentByIdHandler
} from './documentOperations';
import runSqlPlusPlusQuery, { runSqlPlusPlusQueryHandler } from './runSqlPlusPlusQuery';

export {
    getScopesAndCollectionsHandler,
    getSchemaForCollectionHandler,
    getDocumentByIdHandler,
    upsertDocumentByIdHandler,
    deleteDocumentByIdHandler,
    runSqlPlusPlusQueryHandler
};

export default [
    getScopesAndCollections,
    getSchemaForCollection,
    documentOperations,
    runSqlPlusPlusQuery
];