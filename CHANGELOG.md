# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [1.0.0] - 2015-07-02
### Breaking Changes
- `gardr-ext iframe.htm` introduces breaking change, see [Gardr-ext changelog](../gardr-ext/CHANGELOG.md). Gardr-host will bust the iframe url with query-parameter.

### Fixes
- Cross-domain-events upgraded to 0.4.0 for legacy IE support
- Cleans up items with removed containers from document

### New / Added
- Trigger "item:queued" for the pluginApi on item queued (sgulseth)
