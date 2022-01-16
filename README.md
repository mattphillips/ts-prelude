# ts-prelude

Currently a collection of functional datatypes that I use on every project and will eventually expand further into a standard lib of fp utils / algebraic-data-types.

ADTs currently available:

- Maybe
- Result
- IO
- AsyncData
- AsyncResult
- Ref

Utils:

- match (pattern matching)
- TaggedUnion (builds discriminatred unions aka ADTs)
- Nominal (construct nominal datatypes)
- Phantom (constuct phantom datatypes)
- Function
- Property (sugar for a nicer `property` based test definition)
- Refined (a library to build refined types)

Inspiration for above:

- Haskell
- Purescript
- Scala
- Reason
- [Relude](https://github.com/reazen/relude/)
- [Refined scala](https://github.com/fthomas/refined)
