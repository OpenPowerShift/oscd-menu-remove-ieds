<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="test-no-ieds"/>
  <Substation name="S1">
    <VoltageLevel name="V1">
      <Bay name="B1"/>
    </VoltageLevel>
  </Substation>
  <DataTypeTemplates>
    <LNodeType lnClass="LLN0" id="LLN0_Test">
      <DO name="Beh" type="Beh_Test"/>
    </LNodeType>
  </DataTypeTemplates>
</SCL>
