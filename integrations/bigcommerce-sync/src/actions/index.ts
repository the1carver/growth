import syncProducts from './sync-products'
import getProduct from './get-product'
import callApi from './call-api'
import * as bp from '.botpress'

export default {
  syncProducts,
  getProduct,
  callApi,
} satisfies bp.IntegrationProps['actions'] 