SHELL=/bin/bash

.PHONY: local remote ci clean

# TODO: add --die-on=warning when we fix all the warnings
local: index.bs
	bikeshed index.bs index.html

# TODO: add -F die-on=warning when we fix all the warnings
index.html: index.bs
	@ (HTTP_STATUS=$$(curl https://api.csswg.org/bikeshed/ \
	                       --output index.html \
	                       --write-out "%{http_code}" \
	                       --header "Accept: text/plain, text/html" \
	                       -F file=@index.bs) && \
	[[ "$$HTTP_STATUS" -eq "200" ]]) || ( \
		echo ""; cat index.html; echo ""; \
		rm -f index.html; \
		exit 22 \
	);

remote: index.html

ci: index.bs index.html
	mkdir -p out
	cp index.html portals-state-transitions.svg out/

clean:
	rm index.html
	rm -rf out
