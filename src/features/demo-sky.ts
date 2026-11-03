// Local comparison only: no atmosphere chunk or changed defaults without this flag.
if (new URLSearchParams(location.search).get('sky') === 'demo') void import('../proto/demo-sky.ts');
