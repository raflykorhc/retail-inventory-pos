const path = require('path');

module.exports = (request, options) => {
  const defaultResolver = options.defaultResolver;
  
  try {
    return defaultResolver(request, options);
  } catch (err) {
    const basedir = options.basedir;
    const normBasedir = path.resolve(basedir).toLowerCase();
    const testsSubstr = path.join('tests').toLowerCase();
    
    if (normBasedir.includes(testsSubstr) && request.startsWith('.')) {
      const normTestsSubstrWithSeparatorSlash = (path.sep + 'tests' + path.sep).toLowerCase();
      const normTestsSubstrWithTrailing = (path.sep + 'tests').toLowerCase();
      
      let index = normBasedir.indexOf(normTestsSubstrWithSeparatorSlash);
      let separatorLen = normTestsSubstrWithSeparatorSlash.length - 1;
      
      if (index === -1) {
        index = normBasedir.indexOf(normTestsSubstrWithTrailing);
        separatorLen = normTestsSubstrWithTrailing.length;
      }
      
      if (index !== -1) {
        const rootDir = basedir.substring(0, index);
        const subPath = basedir.substring(index + separatorLen);
        const targetBasedir = path.join(rootDir, subPath);
        
        try {
          return defaultResolver(request, {
            ...options,
            basedir: targetBasedir
          });
        } catch (innerErr) {
          throw err;
        }
      }
    }
    throw err;
  }
};
