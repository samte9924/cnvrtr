import NoSSRWrapper from "./NoSSRWrapper";
import Convert from "./Convert";

function Page() {
  return (
    <NoSSRWrapper>
      <Convert />
    </NoSSRWrapper>
  );
}

export default Page;
